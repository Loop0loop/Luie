import { performance } from "node:perf_hooks";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../../../database/main/databaseService.js";
import { memoryChunk } from "../../../database/schema/index.js";
import { escapeLike } from "../../../utils/query/index.js";
import { normalizeSearchTokens } from "./tokenNormalization.js";

type LoggerLike = {
  warn: (message: string, details?: unknown) => void;
};

type ChunkIdScope = {
  chunkIdPrefix?: string;
  maxShadowBetaChapter?: number | null;
};

export type ChunkRank = { chunkId: string; rank: number };
export type ScoredChunkRank = { chunkId: string; score: number };
export type HybridChunkRankStage = "fts" | "shortToken" | "vector" | "rrf";

type HybridChunkRankInput = {
  projectId: string;
  normalizedQuery: string;
  resultLimit: number;
  candidateCap: number;
  logger: LoggerLike;
  embedQuery?: (
    projectId: string,
    texts: string[],
  ) => Promise<readonly ArrayLike<number>[] | null | undefined>;
  scope?: ChunkIdScope;
  additionalRankSources?: ChunkRank[][];
  vectorWarningMessage: string;
  onStage?: (
    stage: HybridChunkRankStage,
    durationMs: number,
    candidateCount: number,
    skipped?: boolean,
  ) => void;
};

const RRF_K = 60;
const VECTOR_SEARCH_UTILITY_ONLY =
  process.env.LUIE_VECTOR_SEARCH_UTILITY_ONLY !== "0";

/** trigram FTS5 는 3-그램 인덱스라 토큰 길이가 3자 미만이면 매칭되지 않는다. */
const TRIGRAM_MIN_TOKEN_LENGTH = 3;

export const buildFtsQuery = (query: string): string => {
  const tokens = normalizeSearchTokens(query).filter(
    (token) => token.length >= TRIGRAM_MIN_TOKEN_LENGTH,
  );
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t.replaceAll('"', '""')}"`).join(" OR ");
};

const collectShortTokens = (query: string): string[] =>
  normalizeSearchTokens(query).filter(
    (token) => token.length >= 2 && token.length < TRIGRAM_MIN_TOKEN_LENGTH,
  );

export const shouldRunVectorSearch = (): boolean =>
  db.isVectorSearchEnabled() &&
  (VECTOR_SEARCH_UTILITY_ONLY
    ? process.env.LUIE_IS_UTILITY_PROCESS === "1"
    : true);

export const mergeWithRRF = (
  rankSources: Array<Array<{ chunkId: string; rank: number }>>,
  topK: number,
): Array<{ chunkId: string; score: number }> => {
  const scores = new Map<string, number>();
  for (const source of rankSources) {
    for (const { chunkId, rank } of source) {
      scores.set(chunkId, (scores.get(chunkId) ?? 0) + 1 / (RRF_K + rank));
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([chunkId, score]) => ({ chunkId, score }));
};

const roundDuration = (value: number): number => Math.round(value * 1000) / 1000;

const recordHybridStage = (
  input: HybridChunkRankInput,
  stage: HybridChunkRankStage,
  startedAt: number,
  candidateCount: number,
  skipped?: boolean,
): void => {
  input.onStage?.(
    stage,
    roundDuration(performance.now() - startedAt),
    candidateCount,
    skipped,
  );
};

const buildChunkAliasScopeSql = (scope: ChunkIdScope = {}) => {
  const prefix = scope.chunkIdPrefix;
  if (!prefix) return sql``;
  if (scope.maxShadowBetaChapter === undefined || scope.maxShadowBetaChapter === null) {
    return sql`AND chunk."id" LIKE ${`${escapeLike(prefix)}%`} ESCAPE '\\'`;
  }
  const chapters = Array.from(
    { length: Math.max(0, scope.maxShadowBetaChapter) },
    (_, index) => index + 1,
  );
  if (chapters.length === 0) return sql`AND 0 = 1`;
  return sql`AND (${sql.join(
    chapters.map(
      (chapterOrder) =>
        sql`chunk."id" LIKE ${`${escapeLike(prefix)}chapter-${chapterOrder}:%`} ESCAPE '\\'`,
    ),
    sql` OR `,
  )})`;
};

export async function searchHybridChunkRanks(
  input: HybridChunkRankInput,
): Promise<ScoredChunkRank[]> {
  const client = db.getClient();
  const ftsQuery = buildFtsQuery(input.normalizedQuery);
  let stageStartedAt = performance.now();
  const ftsRows =
    ftsQuery.length > 0
      ? client.all<{ chunkId: string }>(sql`
          SELECT fts."chunkId" AS "chunkId"
          FROM "MemoryChunkFts" fts
          JOIN "MemoryChunk" chunk
            ON chunk."id" = fts."chunkId"
           AND chunk."projectId" = fts."projectId"
          WHERE fts."projectId" = ${input.projectId}
            AND "MemoryChunkFts" MATCH ${ftsQuery}
            ${buildChunkAliasScopeSql(input.scope)}
          ORDER BY bm25("MemoryChunkFts"), fts."chunkId"
          LIMIT ${input.candidateCap};
        `)
      : [];
  recordHybridStage(input, "fts", stageStartedAt, ftsRows.length, ftsQuery.length === 0);

  stageStartedAt = performance.now();
  const lexicalRanks = await searchByShortTokens(
    input.projectId,
    input.normalizedQuery,
    input.candidateCap,
    input.logger,
    input.scope,
  );
  recordHybridStage(input, "shortToken", stageStartedAt, lexicalRanks.length);

  let denseRanks: ChunkRank[] = [];
  const vectorStartedAt = performance.now();
  const vectorSkipped = !input.embedQuery || !shouldRunVectorSearch();
  if (!vectorSkipped) {
    try {
      const vecs = await input.embedQuery?.(input.projectId, [input.normalizedQuery]);
      const queryVector = vecs?.[0] ? new Float32Array(vecs[0]) : null;
      if (queryVector && queryVector.length > 0) {
        denseRanks = searchByVector(
          input.projectId,
          queryVector,
          input.candidateCap,
          input.logger,
          input.scope,
        );
      }
    } catch (error) {
      input.logger.warn(input.vectorWarningMessage, {
        projectId: input.projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  recordHybridStage(input, "vector", vectorStartedAt, denseRanks.length, vectorSkipped);

  stageStartedAt = performance.now();
  const merged = mergeWithRRF(
    [
      ftsRows.map((row, index) => ({
        chunkId: row.chunkId,
        rank: index + 1,
      })),
      ...(input.additionalRankSources ?? []),
      lexicalRanks,
      denseRanks,
    ],
    input.resultLimit,
  );
  recordHybridStage(input, "rrf", stageStartedAt, merged.length);
  return merged;
}

const buildShadowBetaChapterLikeSql = (scope: ChunkIdScope) => {
  const prefix = scope.chunkIdPrefix;
  if (!prefix) return undefined;
  if (scope.maxShadowBetaChapter === undefined || scope.maxShadowBetaChapter === null) {
    return sql`${memoryChunk.id} LIKE ${`${escapeLike(prefix)}%`} ESCAPE '\\'`;
  }
  const chapters = Array.from(
    { length: Math.max(0, scope.maxShadowBetaChapter) },
    (_, index) => index + 1,
  );
  if (chapters.length === 0) return sql`0 = 1`;
  return or(
    ...chapters.map(
      (chapterOrder) =>
        sql`${memoryChunk.id} LIKE ${`${escapeLike(prefix)}chapter-${chapterOrder}:%`} ESCAPE '\\'`,
    ),
  );
};

const buildShadowBetaChapterLikePatterns = (scope: ChunkIdScope): string[] => {
  const prefix = scope.chunkIdPrefix;
  if (!prefix) return [];
  if (scope.maxShadowBetaChapter === undefined || scope.maxShadowBetaChapter === null) {
    return [`${escapeLike(prefix)}%`];
  }
  return Array.from(
    { length: Math.max(0, scope.maxShadowBetaChapter) },
    (_, index) => `${escapeLike(prefix)}chapter-${index + 1}:%`,
  );
};

export const searchByShortTokens = async (
  projectId: string,
  query: string,
  limit: number,
  logger: LoggerLike,
  scope: ChunkIdScope = {},
): Promise<Array<{ chunkId: string; rank: number }>> => {
  const shortTokens = collectShortTokens(query);
  if (shortTokens.length === 0) return [];

  const predicates = shortTokens.map((token) => {
    const escaped = escapeLike(token);
    return sql`${memoryChunk.indexText} LIKE ${`%${escaped}%`} ESCAPE '\\'`;
  });

  try {
    const rows = await db
      .getClient()
      .select({ chunkId: memoryChunk.id })
      .from(memoryChunk)
      .where(
        and(
          eq(memoryChunk.projectId, projectId),
          or(...predicates),
          buildShadowBetaChapterLikeSql(scope),
        ),
      )
      .orderBy(desc(memoryChunk.updatedAt))
      .limit(limit);
    return rows.map((row, index) => ({
      chunkId: row.chunkId,
      rank: index + 1,
    }));
  } catch (error) {
    logger.warn("Short-token LIKE fallback failed; skipping", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

export const searchByVector = (
  projectId: string,
  queryVec: Float32Array,
  limit: number,
  logger: LoggerLike,
  scope: ChunkIdScope = {},
): Array<{ chunkId: string; rank: number }> => {
  try {
    const queryVecBlob = Buffer.from(
      queryVec.buffer,
      queryVec.byteOffset,
      queryVec.byteLength,
    );
    const scopedPatterns = buildShadowBetaChapterLikePatterns(scope);
    const rows = db.getClient().all<{ chunkId: string }>(sql`
      SELECT embedding."chunkId" AS "chunkId"
      FROM "MemoryEmbedding" embedding
      JOIN "MemoryChunk" chunk
        ON embedding."chunkId" = chunk."id"
       AND embedding."projectId" = chunk."projectId"
      WHERE embedding."projectId" = ${projectId}
        AND embedding."dimension" = ${queryVec.length}
        AND length(embedding."vec") = embedding."dimension" * 4
        AND embedding."contentHash" = COALESCE(NULLIF(chunk."indexTextHash", ''), chunk."contentHash")
        ${scope.chunkIdPrefix ? sql`AND (${scopedPatterns.length > 0 ? sql.join(
          scopedPatterns.map((pattern) => sql`chunk."id" LIKE ${pattern} ESCAPE '\\'`),
          sql` OR `,
        ) : sql`0 = 1`})` : sql``}
      ORDER BY vec_distance_cosine(embedding."vec", ${queryVecBlob})
      LIMIT ${limit};
    `);
    return rows.map((row, index) => ({
      chunkId: row.chunkId,
      rank: index + 1,
    }));
  } catch (error) {
    logger.warn("Vector search failed; fallback to FTS only", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};
