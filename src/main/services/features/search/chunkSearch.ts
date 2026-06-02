import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { memoryChunk } from "../../../database/schema.js";
import { escapeLike } from "../../../utils/queryHelpers.js";

type LoggerLike = {
  warn: (message: string, details?: unknown) => void;
};

const RRF_K = 60;
const VECTOR_SEARCH_UTILITY_ONLY =
  process.env.LUIE_VECTOR_SEARCH_UTILITY_ONLY !== "0";

const KOREAN_SUFFIXES = [
  "은", "는", "이", "가", "을", "를", "에", "에서", "에게", "한테", "께",
  "와", "과", "으로", "로", "도", "만", "까지", "부터", "처럼", "보다", "의",
  "랑", "이라", "라", "야", "요", "다",
] as const;

/** trigram FTS5 는 3-그램 인덱스라 토큰 길이가 3자 미만이면 매칭되지 않는다. */
const TRIGRAM_MIN_TOKEN_LENGTH = 3;

const normalizeSearchTokens = (query: string): string[] => {
  const seeds = query.trim().split(/\s+/).filter(Boolean);
  const expanded = new Set<string>();
  for (const token of seeds) {
    expanded.add(token);
    for (const suffix of KOREAN_SUFFIXES) {
      if (token.endsWith(suffix) && token.length - suffix.length >= 2) {
        expanded.add(token.slice(0, token.length - suffix.length));
      }
    }
  }
  return [...expanded].filter((token) => token.length > 0);
};

export const buildFtsQuery = (query: string): string => {
  const tokens = normalizeSearchTokens(query).filter(
    (token) => token.length >= TRIGRAM_MIN_TOKEN_LENGTH,
  );
  if (tokens.length === 0) return "";
  return tokens.map((t) => `"${t.replaceAll('"', '""')}"`).join(" OR ");
};

const collectShortTokens = (query: string): string[] =>
  normalizeSearchTokens(query).filter(
    (token) =>
      token.length >= 2 &&
      token.length < TRIGRAM_MIN_TOKEN_LENGTH,
  );

export const shouldRunVectorSearch = (): boolean =>
  db.isVectorSearchEnabled() &&
  (
    VECTOR_SEARCH_UTILITY_ONLY
      ? process.env.LUIE_IS_UTILITY_PROCESS === "1"
      : true
  );

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

export const searchByShortTokens = async (
  projectId: string,
  query: string,
  limit: number,
  logger: LoggerLike,
): Promise<Array<{ chunkId: string; rank: number }>> => {
  const shortTokens = collectShortTokens(query);
  if (shortTokens.length === 0) return [];

  const predicates = shortTokens.map((token) => {
    const escaped = escapeLike(token);
    return sql`${memoryChunk.content} LIKE ${`%${escaped}%`} ESCAPE '\\'`;
  });

  try {
    const rows = await db
      .getClient()
      .select({ chunkId: memoryChunk.id })
      .from(memoryChunk)
      .where(and(eq(memoryChunk.projectId, projectId), or(...predicates)))
      .orderBy(desc(memoryChunk.updatedAt))
      .limit(limit);
    return rows.map((row, index) => ({ chunkId: row.chunkId, rank: index + 1 }));
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
): Array<{ chunkId: string; rank: number }> => {
  try {
    const queryVecBlob = Buffer.from(
      queryVec.buffer,
      queryVec.byteOffset,
      queryVec.byteLength,
    );
    const rows = db.getClient().all<{ chunkId: string }>(sql`
      SELECT "chunkId"
      FROM "MemoryEmbedding"
      WHERE "projectId" = ${projectId}
        AND "dimension" = ${queryVec.length}
        AND length("vec") = "dimension" * 4
      ORDER BY vec_distance_cosine("vec", ${queryVecBlob})
      LIMIT ${limit};
    `);
    return rows.map((row, index) => ({ chunkId: row.chunkId, rank: index + 1 }));
  } catch (error) {
    logger.warn("Vector search failed; fallback to FTS only", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};
