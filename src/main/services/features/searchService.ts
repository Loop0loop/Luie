/**
 * Search service - 통합 검색 (고유명사 우선)
 */

import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import { character, memoryChunk, term } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  MemoryChunkBacklink,
  MemoryChunkSearchQuery,
  MemoryChunkSearchResult,
  SearchQuery,
} from "../../../shared/types/index.js";
import { ServiceError } from "../../utils/serviceError.js";
import { escapeLike } from "../../utils/queryHelpers.js";
import { resolveModelRuntimeClient } from "../llm/modelRuntimeFactory.js";

const loadChapterSearchCacheService = async () =>
  (await import("./chapterSearchCacheService.js")).chapterSearchCacheService;

const logger = createLogger("SearchService");

interface SearchResult {
  type: "character" | "term" | "chapter";
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export class SearchService {
  private static readonly RRF_K = 60;
  private runtimeCache = new Map<string, { runtime: Awaited<ReturnType<typeof resolveModelRuntimeClient>>; expiresAt: number }>();
  private static readonly RUNTIME_CACHE_TTL_MS = 30_000;

  private buildFtsQuery(query: string): string {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return '""';
    return tokens.map((t) => `"${t.replaceAll('"', '""')}"`).join(" AND ");
  }

  async search(input: SearchQuery): Promise<SearchResult[]> {
    try {
      const results: SearchResult[] = [];
      const escapedQuery = escapeLike(input.query);

      if (input.type === "all" || input.type === "character") {
        const characters = await db.getClient()
          .select({
            id: character.id,
            name: character.name,
            description: character.description,
          })
          .from(character)
          .where(
            and(
              eq(character.projectId, input.projectId),
              isNull(character.deletedAt),
              or(
                like(character.name, `%${escapedQuery}%`),
                like(character.description ?? "", `%${escapedQuery}%`),
              ),
            ),
          )
          .limit(10);

        characters.forEach((char) => {
          results.push({
            type: "character",
            id: char.id,
            title: char.name,
            description: char.description ?? undefined,
            metadata: {
              appearancesCount: 0,
            },
          });
        });
      }

      if (input.type === "all" || input.type === "term") {
        const terms = await db.getClient()
          .select({
            id: term.id,
            term: term.term,
            definition: term.definition,
            category: term.category,
          })
          .from(term)
          .where(
            and(
              eq(term.projectId, input.projectId),
              isNull(term.deletedAt),
              or(
                like(term.term, `%${escapedQuery}%`),
                like(term.definition ?? "", `%${escapedQuery}%`),
              ),
            ),
          )
          .limit(10);

        terms.forEach((t) => {
          results.push({
            type: "term",
            id: t.id,
            title: t.term,
            description: t.definition ?? undefined,
            metadata: {
              category: t.category ?? undefined,
            },
          });
        });
      }

      if (input.type === "all") {
        const chapterSearchCacheService = await loadChapterSearchCacheService();
        const chapters = await chapterSearchCacheService.searchProjectChapters(
          input.projectId,
          input.query,
          5,
        );

        chapters.forEach((chapter) => {
          results.push({
            type: "chapter",
            id: chapter.chapterId,
            title: chapter.title,
            description: chapter.synopsis ?? undefined,
            metadata: {
              wordCount: chapter.wordCount,
              order: chapter.chapterOrder,
            },
          });
        });
      }

      results.sort((a, b) => {
        const typeOrder = { term: 0, character: 1, chapter: 2 };
        const typeCompare = typeOrder[a.type] - typeOrder[b.type];

        if (typeCompare !== 0) return typeCompare;

        return a.title.localeCompare(b.title);
      });

      logger.info("Search completed", {
        projectId: input.projectId,
        query: input.query,
        resultCount: results.length,
      });

      return results;
    } catch (error) {
      logger.error("Search failed", error);
      throw new ServiceError(
        ErrorCode.SEARCH_QUERY_FAILED,
        "Search failed",
        { input },
        error,
      );
    }
  }

  async searchCharacters(projectId: string, query: string) {
    return this.search({ projectId, query, type: "character" });
  }

  async searchTerms(projectId: string, query: string) {
    return this.search({ projectId, query, type: "term" });
  }

  async searchChapters(projectId: string, query: string) {
    return this.search({ projectId, query, type: "all" });
  }

  async searchChunks(input: MemoryChunkSearchQuery): Promise<MemoryChunkSearchResult[]> {
    const normalizedQuery = input.query.trim();
    if (normalizedQuery.length === 0) {
      return [];
    }
    const limit = Math.max(1, Math.min(input.limit ?? 20, 100));

    try {
      const client = db.getClient();
      const ftsQuery = this.buildFtsQuery(normalizedQuery);
      const ftsRows = client.all<{
        chunkId: string;
      }>(sql`
        SELECT fts."chunkId" AS "chunkId"
        FROM "MemoryChunkFts" fts
        WHERE fts."projectId" = ${input.projectId}
          AND "MemoryChunkFts" MATCH ${ftsQuery}
        ORDER BY bm25("MemoryChunkFts"), fts."chunkId"
        LIMIT ${Math.max(limit, 50)};
      `);
      const runtime = await this.resolveRuntimeCached(input.projectId);
      let denseRanks: Array<{ chunkId: string; rank: number }> = [];
      const queryVectors = db.isVectorSearchEnabled()
        ? await runtime.embed([normalizedQuery])
        : null;
      const queryVector = queryVectors?.[0] ?? null;
      if (queryVector && queryVector.length > 0) {
        denseRanks = await this.searchByVector(input.projectId, queryVector, Math.max(limit, 50));
      }
      const merged = this.mergeWithRRF(
        ftsRows.map((row, index) => ({ chunkId: row.chunkId, rank: index + 1 })),
        denseRanks,
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
        .where(sql`${memoryChunk.id} IN (${sql.join(chunkIds.map((id) => sql`${id}`), sql`,`)})`);
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

  private async resolveRuntimeCached(projectId: string): Promise<Awaited<ReturnType<typeof resolveModelRuntimeClient>>> {
    const cached = this.runtimeCache.get(projectId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.runtime;
    }
    const runtime = await resolveModelRuntimeClient(projectId);
    this.runtimeCache.set(projectId, {
      runtime,
      expiresAt: Date.now() + SearchService.RUNTIME_CACHE_TTL_MS,
    });
    return runtime;
  }

  private mergeWithRRF(
    ftsResults: Array<{ chunkId: string; rank: number }>,
    denseResults: Array<{ chunkId: string; rank: number }>,
    topK: number,
  ): Array<{ chunkId: string; score: number }> {
    const scores = new Map<string, number>();
    for (const { chunkId, rank } of ftsResults) {
      scores.set(chunkId, (scores.get(chunkId) ?? 0) + 1 / (SearchService.RRF_K + rank));
    }
    for (const { chunkId, rank } of denseResults) {
      scores.set(chunkId, (scores.get(chunkId) ?? 0) + 1 / (SearchService.RRF_K + rank));
    }
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([chunkId, score]) => ({ chunkId, score }));
  }

  private async searchByVector(
    projectId: string,
    queryVec: Float32Array,
    limit: number,
  ): Promise<Array<{ chunkId: string; rank: number }>> {
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
  }

  async getChunkBacklink(chunkId: string): Promise<MemoryChunkBacklink> {
    try {
      const rows = await db.getClient()
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

  async getQuickAccess(projectId: string) {
    try {
      const client = db.getClient();
      const recentTerms = await client
        .select({
          id: term.id,
          term: term.term,
          definition: term.definition,
        })
        .from(term)
        .where(and(eq(term.projectId, projectId), isNull(term.deletedAt)))
        .orderBy(desc(term.createdAt))
        .limit(5);

      const recentCharacters = await client
        .select({
          id: character.id,
          name: character.name,
          description: character.description,
        })
        .from(character)
        .where(and(eq(character.projectId, projectId), isNull(character.deletedAt)))
        .orderBy(desc(character.createdAt))
        .limit(5);

      const results: SearchResult[] = [
        ...recentTerms.map((t) => ({
          type: "term" as const,
          id: t.id,
          title: t.term,
          description: t.definition ?? undefined,
        })),
        ...recentCharacters.map((char) => ({
          type: "character" as const,
          id: char.id,
          title: char.name,
          description: char.description ?? undefined,
        })),
      ];

      logger.info("Quick access retrieved", {
        projectId,
        termCount: recentTerms.length,
        characterCount: recentCharacters.length,
      });

      return results;
    } catch (error) {
      logger.error("Failed to get quick access", error);
      throw new ServiceError(
        ErrorCode.SEARCH_QUERY_FAILED,
        "Failed to get quick access",
        { projectId },
        error,
      );
    }
  }
}

export const searchService = new SearchService();
