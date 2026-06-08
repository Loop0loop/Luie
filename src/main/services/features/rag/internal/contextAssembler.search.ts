import { asc, and, eq, or, sql } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import {
  buildFtsQuery,
  mergeWithRRF,
  searchByShortTokens,
  searchByVector,
  shouldRunVectorSearch,
} from "../../search/index.js";
import { memoryChunk } from "../../../../database/schema/index.js";
import type { MemoryChunkSearchResult } from "../../../../../shared/types/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import type { RagEmbeddingProvider } from "./contextAssembler.types.js";

type FtsRow = { chunkId: string };
type ChunkRow = {
  chunkId: string;
  chapterId: string | null;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  paragraphStartIndex: number;
  paragraphEndIndex: number;
};
type WindowChunkRow = {
  chunkId: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  paragraphStartIndex: number;
  paragraphEndIndex: number;
};
type ScoredChunk = {
  chunkId: string;
  score: number;
};

type SearchInput = {
  projectId: string;
  query: string;
  limit: number;
  embedTexts?: RagEmbeddingProvider;
  parentWindow?: {
    before: number;
    after: number;
  };
};

const logger = createLogger("RagContextAssemblerSearch");

export async function searchMemoryChunksForRag(
  input: SearchInput,
): Promise<MemoryChunkSearchResult[]> {
  const normalizedQuery = input.query.trim();
  if (normalizedQuery.length === 0) return [];

  const limit = Math.max(1, Math.min(input.limit, 100));
  const client = db.getClient();
  const ftsQuery = buildFtsQuery(normalizedQuery);
  const ftsRows: FtsRow[] =
    ftsQuery.length > 0
      ? client.all<{ chunkId: string }>(sql`
      SELECT fts."chunkId" AS "chunkId"
      FROM "MemoryChunkFts" fts
      WHERE fts."projectId" = ${input.projectId}
        AND "MemoryChunkFts" MATCH ${ftsQuery}
      ORDER BY bm25("MemoryChunkFts"), fts."chunkId"
      LIMIT ${Math.max(limit, 50)};
    `)
      : [];

  const lexicalRanks = await searchByShortTokens(
    input.projectId,
    normalizedQuery,
    Math.max(limit, 50),
    logger,
  );

  let denseRanks: Array<{ chunkId: string; rank: number }> = [];
  if (input.embedTexts && shouldRunVectorSearch()) {
    try {
      const vecs = await input.embedTexts(input.projectId, [normalizedQuery]);
      const queryVector = vecs?.[0] ? new Float32Array(vecs[0]) : null;
      if (queryVector && queryVector.length > 0) {
        denseRanks = searchByVector(
          input.projectId,
          queryVector,
          Math.max(limit, 50),
          logger,
        );
      }
    } catch (error) {
      logger.warn("RAG embedding unavailable; fallback to FTS only", {
        projectId: input.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const merged = mergeWithRRF(
    [
      ftsRows.map(
        (row: FtsRow, index: number) => ({ chunkId: row.chunkId, rank: index + 1 }),
      ),
      lexicalRanks,
      denseRanks,
    ],
    limit,
  ) as ScoredChunk[];
  if (merged.length === 0) return [];

  const chunkIds = merged.map((row) => row.chunkId);
  const chunkRows: ChunkRow[] = await client
    .select({
      chunkId: memoryChunk.id,
      chapterId: memoryChunk.chapterId,
      sourceType: memoryChunk.sourceType,
      sourceId: memoryChunk.sourceId,
      chunkIndex: memoryChunk.chunkIndex,
      content: memoryChunk.content,
      startOffset: memoryChunk.startOffset,
      endOffset: memoryChunk.endOffset,
      paragraphStartIndex: memoryChunk.paragraphStartIndex,
      paragraphEndIndex: memoryChunk.paragraphEndIndex,
    })
    .from(memoryChunk)
    .where(
      sql`${memoryChunk.id} IN (${sql.join(
        chunkIds.map((id) => sql`${id}`),
        sql`,`,
      )})`,
    );
  const chunkMap = new Map(chunkRows.map((row) => [row.chunkId, row]));
  const mapped = merged
    .map((row) => {
      const chunk = chunkMap.get(row.chunkId);
      if (!chunk) return null;
      return {
        chunkId: chunk.chunkId,
        chapterId: chunk.chapterId ?? null,
        content: chunk.content,
        startOffset: chunk.startOffset ?? null,
        endOffset: chunk.endOffset ?? null,
        score: row.score,
      };
    })
    .filter((row): row is MemoryChunkSearchResult => row !== null);
  if (!input.parentWindow) return mapped;

  const ranges = mapped.flatMap((row) => {
    const chunk = chunkMap.get(row.chunkId);
    if (!chunk) return [];
    return [{
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      minIndex: chunk.chunkIndex - input.parentWindow!.before,
      maxIndex: chunk.chunkIndex + input.parentWindow!.after,
    }];
  });
  const predicates = ranges.map((range) =>
    and(
      eq(memoryChunk.projectId, input.projectId),
      eq(memoryChunk.sourceType, range.sourceType),
      eq(memoryChunk.sourceId, range.sourceId),
      sql`${memoryChunk.chunkIndex} BETWEEN ${range.minIndex} AND ${range.maxIndex}`,
    ),
  );
  const windowRows: WindowChunkRow[] = predicates.length === 0
    ? []
    : await client
        .select({
          chunkId: memoryChunk.id,
          sourceType: memoryChunk.sourceType,
          sourceId: memoryChunk.sourceId,
          chunkIndex: memoryChunk.chunkIndex,
          content: memoryChunk.content,
          startOffset: memoryChunk.startOffset,
          endOffset: memoryChunk.endOffset,
          paragraphStartIndex: memoryChunk.paragraphStartIndex,
          paragraphEndIndex: memoryChunk.paragraphEndIndex,
        })
        .from(memoryChunk)
        .where(predicates.length === 1 ? predicates[0] : or(...predicates))
        .orderBy(
          asc(memoryChunk.sourceType),
          asc(memoryChunk.sourceId),
          asc(memoryChunk.chunkIndex),
        );
  const windowRowsBySource = new Map<string, WindowChunkRow[]>();
  for (const row of windowRows) {
    const key = `${row.sourceType}:${row.sourceId}`;
    const rows = windowRowsBySource.get(key) ?? [];
    rows.push(row);
    windowRowsBySource.set(key, rows);
  }

  return mapped.map((row) => {
    const chunk = chunkMap.get(row.chunkId);
    if (!chunk) return row;
    const minIndex = chunk.chunkIndex - input.parentWindow!.before;
    const maxIndex = chunk.chunkIndex + input.parentWindow!.after;
    const rows = (windowRowsBySource.get(`${chunk.sourceType}:${chunk.sourceId}`) ?? [])
      .filter((windowRow) =>
        windowRow.chunkIndex >= minIndex && windowRow.chunkIndex <= maxIndex,
      );
    return {
      ...row,
      parentWindow: {
        chunkIds: rows.map((windowRow) => windowRow.chunkId),
        content: rows.map((windowRow) => windowRow.content).join("\n\n"),
        startOffset: rows.reduce<number | null>(
          (lowest, windowRow) =>
            windowRow.startOffset === null
              ? lowest
              : lowest === null
                ? windowRow.startOffset
                : Math.min(lowest, windowRow.startOffset),
          null,
        ),
        endOffset: rows.reduce<number | null>(
          (highest, windowRow) =>
            windowRow.endOffset === null
              ? highest
              : highest === null
                ? windowRow.endOffset
                : Math.max(highest, windowRow.endOffset),
          null,
        ),
        paragraphStartIndex: rows.reduce<number | null>(
          (lowest, windowRow) =>
            lowest === null
              ? windowRow.paragraphStartIndex
              : Math.min(lowest, windowRow.paragraphStartIndex),
          null,
        ),
        paragraphEndIndex: rows.reduce<number | null>(
          (highest, windowRow) =>
            highest === null
              ? windowRow.paragraphEndIndex
              : Math.max(highest, windowRow.paragraphEndIndex),
          null,
        ),
      },
    };
  });
}
