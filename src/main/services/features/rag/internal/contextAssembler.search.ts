import { sql } from "drizzle-orm";
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
  content: string;
  startOffset: number | null;
  endOffset: number | null;
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
      content: memoryChunk.content,
      startOffset: memoryChunk.startOffset,
      endOffset: memoryChunk.endOffset,
    })
    .from(memoryChunk)
    .where(
      sql`${memoryChunk.id} IN (${sql.join(
        chunkIds.map((id) => sql`${id}`),
        sql`,`,
      )})`,
    );
  const chunkMap = new Map(chunkRows.map((row) => [row.chunkId, row]));
  return merged
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
}
