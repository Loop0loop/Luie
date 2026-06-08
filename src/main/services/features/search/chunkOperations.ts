import { and, asc, eq, sql } from "drizzle-orm";
import { ErrorCode } from "../../../../shared/constants/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import type {
  MemoryChunkBacklink,
  MemoryChunkSearchQuery,
  MemoryChunkSearchResult,
  MemoryChunkWindowQuery,
  MemoryChunkWindowResult,
} from "../../../../shared/types/index.js";
import { db } from "../../../database/main/databaseService.js";
import { memoryChunk } from "../../../database/schema/index.js";
import { ServiceError } from "../../../utils/error/index.js";
import {
  buildFtsQuery,
  mergeWithRRF,
  searchByShortTokens,
  searchByVector,
  shouldRunVectorSearch,
} from "./chunkSearch.js";

const logger = createLogger("SearchService");

type EmbedQuery = (
  projectId: string,
  texts: string[],
) => Promise<number[][] | null | undefined>;

export async function searchChunks(
  input: MemoryChunkSearchQuery,
  embedQuery: EmbedQuery,
): Promise<MemoryChunkSearchResult[]> {
  const normalizedQuery = input.query.trim();
  if (normalizedQuery.length === 0) {
    return [];
  }
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100));

  try {
    const client = db.getClient();
    const ftsQuery = buildFtsQuery(normalizedQuery);
    const ftsRows =
      ftsQuery.length > 0
        ? client.all<{
            chunkId: string;
          }>(sql`
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
    if (shouldRunVectorSearch()) {
      try {
        const vecs = await embedQuery(input.projectId, [normalizedQuery]);
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
        logger.warn("Embedding unavailable; fallback to FTS only", {
          projectId: input.projectId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const merged = mergeWithRRF(
      [
        ftsRows.map((row, index) => ({
          chunkId: row.chunkId,
          rank: index + 1,
        })),
        lexicalRanks,
        denseRanks,
      ],
      limit,
    );
    if (merged.length === 0) {
      return [];
    }

    const chunkIds = merged.map((row) => row.chunkId);
    const chunkRows = await client
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
  } catch (error) {
    logger.error("Memory chunk search failed", { input, error });
    throw new ServiceError(
      ErrorCode.SEARCH_QUERY_FAILED,
      "Memory chunk search failed",
      { input },
      error,
    );
  }
}

export async function getChunkBacklink(
  chunkId: string,
): Promise<MemoryChunkBacklink> {
  try {
    const rows = await db
      .getClient()
      .select({
        id: memoryChunk.id,
        chapterId: memoryChunk.chapterId,
        startOffset: memoryChunk.startOffset,
        endOffset: memoryChunk.endOffset,
      })
      .from(memoryChunk)
      .where(eq(memoryChunk.id, chunkId))
      .limit(1);
    if (rows.length === 0) {
      throw new ServiceError(
        ErrorCode.MEMORY_CHUNK_NOT_FOUND,
        "Memory chunk not found",
        { chunkId },
      );
    }
    const row = rows[0];
    return {
      chunkId: row.id,
      chapterId: row.chapterId ?? null,
      offset: row.startOffset ?? 0,
      endOffset: row.endOffset ?? null,
    };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    logger.error("Memory chunk backlink lookup failed", { chunkId, error });
    throw new ServiceError(
      ErrorCode.SEARCH_QUERY_FAILED,
      "Memory chunk backlink lookup failed",
      { chunkId },
      error,
    );
  }
}

export async function getChunkWindow(
  input: MemoryChunkWindowQuery,
): Promise<MemoryChunkWindowResult> {
  const before = Math.max(0, Math.min(input.before ?? 1, 10));
  const after = Math.max(0, Math.min(input.after ?? 1, 10));

  try {
    const client = db.getClient();
    const anchors = await client
      .select({
        id: memoryChunk.id,
        projectId: memoryChunk.projectId,
        sourceType: memoryChunk.sourceType,
        sourceId: memoryChunk.sourceId,
        chapterId: memoryChunk.chapterId,
        sceneId: memoryChunk.sceneId,
        chunkIndex: memoryChunk.chunkIndex,
        contextLabel: memoryChunk.contextLabel,
        sourceContentHash: memoryChunk.sourceContentHash,
        paragraphStartIndex: memoryChunk.paragraphStartIndex,
        paragraphEndIndex: memoryChunk.paragraphEndIndex,
      })
      .from(memoryChunk)
      .where(
        and(
          eq(memoryChunk.projectId, input.projectId),
          eq(memoryChunk.id, input.chunkId),
        ),
      )
      .limit(1);

    if (anchors.length === 0) {
      throw new ServiceError(
        ErrorCode.MEMORY_CHUNK_NOT_FOUND,
        "Memory chunk not found",
        { chunkId: input.chunkId, projectId: input.projectId },
      );
    }

    const anchor = anchors[0];
    const useParagraphWindow = input.unit === "paragraph";
    const minIndex = anchor.chunkIndex - before;
    const maxIndex = anchor.chunkIndex + after;
    const minParagraphIndex = anchor.paragraphStartIndex - before;
    const maxParagraphIndex = anchor.paragraphEndIndex + after;
    const rows = await client
      .select({
        chunkId: memoryChunk.id,
        chunkIndex: memoryChunk.chunkIndex,
        chapterId: memoryChunk.chapterId,
        sceneId: memoryChunk.sceneId,
        content: memoryChunk.content,
        startOffset: memoryChunk.startOffset,
        endOffset: memoryChunk.endOffset,
        paragraphStartIndex: memoryChunk.paragraphStartIndex,
        paragraphEndIndex: memoryChunk.paragraphEndIndex,
      })
      .from(memoryChunk)
      .where(
        and(
          eq(memoryChunk.projectId, anchor.projectId),
          eq(memoryChunk.sourceType, anchor.sourceType),
          eq(memoryChunk.sourceId, anchor.sourceId),
          useParagraphWindow
            ? sql`${memoryChunk.paragraphEndIndex} >= ${minParagraphIndex}
                    AND ${memoryChunk.paragraphStartIndex} <= ${maxParagraphIndex}`
            : sql`${memoryChunk.chunkIndex} BETWEEN ${minIndex} AND ${maxIndex}`,
        ),
      )
      .orderBy(asc(memoryChunk.chunkIndex));

    const startOffset = rows.reduce<number | null>(
      (lowest, row) =>
        row.startOffset === null
          ? lowest
          : lowest === null
            ? row.startOffset
            : Math.min(lowest, row.startOffset),
      null,
    );
    const endOffset = rows.reduce<number | null>(
      (highest, row) =>
        row.endOffset === null
          ? highest
          : highest === null
            ? row.endOffset
            : Math.max(highest, row.endOffset),
      null,
    );
    const paragraphStartIndex = rows.reduce<number | null>(
      (lowest, row) =>
        lowest === null
          ? row.paragraphStartIndex
          : Math.min(lowest, row.paragraphStartIndex),
      null,
    );
    const paragraphEndIndex = rows.reduce<number | null>(
      (highest, row) =>
        highest === null
          ? row.paragraphEndIndex
          : Math.max(highest, row.paragraphEndIndex),
      null,
    );

    return {
      projectId: anchor.projectId,
      anchorChunkId: anchor.id,
      sourceType: anchor.sourceType,
      sourceId: anchor.sourceId,
      chapterId: anchor.chapterId ?? null,
      sceneId: anchor.sceneId ?? null,
      contextLabel: anchor.contextLabel ?? null,
      sourceContentHash: anchor.sourceContentHash,
      startOffset,
      endOffset,
      paragraphStartIndex,
      paragraphEndIndex,
      content: rows.map((row) => row.content).join("\n\n"),
      chunks: rows.map((row) => ({
        chunkId: row.chunkId,
        chunkIndex: row.chunkIndex,
        chapterId: row.chapterId ?? null,
        sceneId: row.sceneId ?? null,
        content: row.content,
        startOffset: row.startOffset ?? null,
        endOffset: row.endOffset ?? null,
        paragraphStartIndex: row.paragraphStartIndex,
        paragraphEndIndex: row.paragraphEndIndex,
      })),
    };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    logger.error("Memory chunk window lookup failed", { input, error });
    throw new ServiceError(
      ErrorCode.SEARCH_QUERY_FAILED,
      "Memory chunk window lookup failed",
      { input },
      error,
    );
  }
}
