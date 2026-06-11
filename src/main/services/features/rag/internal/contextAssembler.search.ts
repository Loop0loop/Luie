import { performance } from "node:perf_hooks";
import { asc, and, eq, or, sql } from "drizzle-orm";
import { db } from "../../../../database/main/databaseService.js";
import {
  buildFtsQuery,
  mergeWithRRF,
  searchByShortTokens,
  searchByVector,
  shouldRunVectorSearch,
} from "../../search/chunkSearch.js";
import { memoryChunk } from "../../../../database/schema/index.js";
import type { MemoryChunkSearchResult } from "../../../../../shared/types/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import type { RagEmbeddingProvider } from "./contextAssembler.types.js";
import { resolveSearchOptimizationPolicy } from "../../search/searchOptimizationPolicy.js";

type FtsRow = { chunkId: string };
type ExactPhraseRow = { chunkId: string };
type TokenOverlapRow = { chunkId: string; content: string; chunkIndex: number };
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

export type RagSearchStageName =
  | "fts"
  | "exactPhrase"
  | "quoteToken"
  | "shortToken"
  | "vector"
  | "rrf"
  | "hydrate"
  | "parentWindow";

export type RagSearchStageDiagnostic = {
  stage: RagSearchStageName;
  durationMs: number;
  candidateCount: number;
  skipped?: boolean;
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
  diagnostics?: {
    stages: RagSearchStageDiagnostic[];
  };
};

const logger = createLogger("RagContextAssemblerSearch");

function extractExactPhraseCandidates(query: string): string[] {
  const candidates = new Set<string>();
  const colonIndex = query.lastIndexOf(":");
  if (colonIndex >= 0) {
    candidates.add(query.slice(colonIndex + 1));
  }
  candidates.add(query);
  return [...candidates]
    .map((candidate) => candidate.replace(/\s+/g, " ").trim())
    .filter((candidate) => candidate.length >= 12)
    .slice(0, 3);
}

function extractQuoteLikeTokens(query: string): string[] {
  const colonIndex = query.lastIndexOf(":");
  const quoteLikePart = colonIndex >= 0 ? query.slice(colonIndex + 1) : query;
  return Array.from(
    new Set(
      quoteLikePart
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((token) =>
          token
            .trim()
            .toLowerCase()
            .replace(
              /(으로만|에게만|에서는|으로는|에게는|으로|에게|에서|부터|까지|처럼|보다|과는|와는|에는|의|은|는|이|가|을|를|와|과|도|만|로)$/u,
              "",
            ),
        )
        .filter((token) => token.length >= 2),
    ),
  ).slice(0, 16);
}

function countTokenOverlap(tokens: string[], content: string): number {
  const normalizedContent = content.toLowerCase();
  return tokens.filter((token) => normalizedContent.includes(token)).length;
}

function roundDuration(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function recordStage(
  input: SearchInput,
  stage: RagSearchStageName,
  startedAt: number,
  candidateCount: number,
  skipped?: boolean,
): void {
  input.diagnostics?.stages.push({
    stage,
    durationMs: roundDuration(performance.now() - startedAt),
    candidateCount,
    skipped,
  });
}

export async function searchMemoryChunksForRag(
  input: SearchInput,
): Promise<MemoryChunkSearchResult[]> {
  const normalizedQuery = input.query.trim();
  if (normalizedQuery.length === 0) return [];

  const searchPolicy = resolveSearchOptimizationPolicy({
    requestedLimit: input.limit,
  });
  const limit = searchPolicy.resultLimit;
  const candidateCap = searchPolicy.candidateCap;
  const client = db.getClient();
  const ftsQuery = buildFtsQuery(normalizedQuery);
  let stageStartedAt = performance.now();
  const ftsRows: FtsRow[] =
    ftsQuery.length > 0
      ? client.all<{ chunkId: string }>(sql`
      SELECT fts."chunkId" AS "chunkId"
      FROM "MemoryChunkFts" fts
      WHERE fts."projectId" = ${input.projectId}
        AND "MemoryChunkFts" MATCH ${ftsQuery}
      ORDER BY bm25("MemoryChunkFts"), fts."chunkId"
      LIMIT ${candidateCap};
    `)
      : [];
  recordStage(input, "fts", stageStartedAt, ftsRows.length, ftsQuery.length === 0);
  const exactPhraseCandidates = extractExactPhraseCandidates(normalizedQuery);
  stageStartedAt = performance.now();
  const exactPhraseRows: ExactPhraseRow[] =
    exactPhraseCandidates.length > 0
      ? client.all<ExactPhraseRow>(sql`
      SELECT chunk."id" AS "chunkId"
      FROM "MemoryChunk" chunk
      WHERE chunk."projectId" = ${input.projectId}
        AND (${sql.join(
          exactPhraseCandidates.map(
            (candidate) => sql`instr(chunk."content", ${candidate}) > 0`,
          ),
          sql` OR `,
        )})
      ORDER BY chunk."chunkIndex" ASC, chunk."id"
      LIMIT ${candidateCap};
    `)
      : [];
  recordStage(
    input,
    "exactPhrase",
    stageStartedAt,
    exactPhraseRows.length,
    exactPhraseCandidates.length === 0,
  );
  const quoteLikeTokens = extractQuoteLikeTokens(normalizedQuery);
  stageStartedAt = performance.now();
  const tokenOverlapRows: Array<{ chunkId: string; rank: number }> =
    quoteLikeTokens.length >= 3
      ? client
          .all<TokenOverlapRow>(sql`
            SELECT chunk."id" AS "chunkId",
                   chunk."content" AS "content",
                   chunk."chunkIndex" AS "chunkIndex"
            FROM "MemoryChunk" chunk
            WHERE chunk."projectId" = ${input.projectId}
              AND (${sql.join(
                quoteLikeTokens.map(
                  (token) => sql`instr(lower(chunk."content"), ${token}) > 0`,
                ),
                sql` OR `,
              )})
            ORDER BY chunk."chunkIndex" ASC, chunk."id"
            LIMIT ${candidateCap};
          `)
          .map((row) => ({
            chunkId: row.chunkId,
            score: countTokenOverlap(quoteLikeTokens, row.content),
            chunkIndex: row.chunkIndex,
          }))
          .filter((row) => row.score >= Math.min(4, Math.ceil(quoteLikeTokens.length * 0.45)))
          .sort((a, b) =>
            b.score === a.score ? a.chunkIndex - b.chunkIndex : b.score - a.score,
          )
          .map((row, index) => ({ chunkId: row.chunkId, rank: index + 1 }))
      : [];
  recordStage(
    input,
    "quoteToken",
    stageStartedAt,
    tokenOverlapRows.length,
    quoteLikeTokens.length < 3,
  );

  stageStartedAt = performance.now();
  const lexicalRanks = await searchByShortTokens(
    input.projectId,
    normalizedQuery,
    candidateCap,
    logger,
  );
  recordStage(input, "shortToken", stageStartedAt, lexicalRanks.length);

  let denseRanks: Array<{ chunkId: string; rank: number }> = [];
  const embedTexts = input.embedTexts;
  const vectorStartedAt = performance.now();
  const vectorSkipped = !embedTexts || !shouldRunVectorSearch();
  if (!vectorSkipped) {
    try {
      const vecs = await embedTexts(input.projectId, [normalizedQuery]);
      const queryVector = vecs?.[0] ? new Float32Array(vecs[0]) : null;
      if (queryVector && queryVector.length > 0) {
        denseRanks = searchByVector(
          input.projectId,
          queryVector,
          candidateCap,
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
  recordStage(input, "vector", vectorStartedAt, denseRanks.length, vectorSkipped);

  stageStartedAt = performance.now();
  const merged = mergeWithRRF(
    [
      ftsRows.map((row: FtsRow, index: number) => ({
        chunkId: row.chunkId,
        rank: index + 1,
      })),
      exactPhraseRows.map((row: ExactPhraseRow, index: number) => ({
        chunkId: row.chunkId,
        rank: index + 1,
      })),
      tokenOverlapRows,
      lexicalRanks,
      denseRanks,
    ],
    limit,
  ) as ScoredChunk[];
  recordStage(input, "rrf", stageStartedAt, merged.length);
  if (merged.length === 0) return [];

  const chunkIds = merged.map((row) => row.chunkId);
  stageStartedAt = performance.now();
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
  recordStage(input, "hydrate", stageStartedAt, chunkRows.length);
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
  if (!input.parentWindow) {
    recordStage(input, "parentWindow", performance.now(), 0, true);
    return mapped;
  }

  const ranges = mapped.flatMap((row) => {
    const chunk = chunkMap.get(row.chunkId);
    if (!chunk) return [];
    return [
      {
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
        minIndex: chunk.chunkIndex - input.parentWindow!.before,
        maxIndex: chunk.chunkIndex + input.parentWindow!.after,
      },
    ];
  });
  const predicates = ranges.map((range) =>
    and(
      eq(memoryChunk.projectId, input.projectId),
      eq(memoryChunk.sourceType, range.sourceType),
      eq(memoryChunk.sourceId, range.sourceId),
      sql`${memoryChunk.chunkIndex} BETWEEN ${range.minIndex} AND ${range.maxIndex}`,
    ),
  );
  const windowRows: WindowChunkRow[] =
    (stageStartedAt = performance.now(),
    predicates.length === 0
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
          ));
  recordStage(input, "parentWindow", stageStartedAt, windowRows.length);
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
    const rows = (
      windowRowsBySource.get(`${chunk.sourceType}:${chunk.sourceId}`) ?? []
    ).filter(
      (windowRow) =>
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
