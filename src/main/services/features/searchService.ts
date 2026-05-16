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
  private buildFtsQuery(query: string): string {
    return `"${query.replaceAll('"', '""').trim()}"`;
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
      const rows = client.all<{
        chunkId: string;
        chapterId: string | null;
        content: string;
        startOffset: number | null;
        endOffset: number | null;
        score: number;
      }>(sql`
        SELECT
          fts."chunkId" AS "chunkId",
          mc."chapterId" AS "chapterId",
          mc."content" AS "content",
          mc."startOffset" AS "startOffset",
          mc."endOffset" AS "endOffset",
          bm25("MemoryChunkFts") AS "score"
        FROM "MemoryChunkFts" fts
        INNER JOIN "MemoryChunk" mc ON mc."id" = fts."chunkId"
        WHERE fts."projectId" = ${input.projectId}
          AND "MemoryChunkFts" MATCH ${ftsQuery}
        ORDER BY bm25("MemoryChunkFts"), mc."chapterId", mc."chunkIndex"
        LIMIT ${limit};
      `);

      return rows.map((row) => ({
        chunkId: row.chunkId,
        chapterId: row.chapterId ?? null,
        content: row.content,
        startOffset: row.startOffset ?? null,
        endOffset: row.endOffset ?? null,
        score: typeof row.score === "number" ? row.score : Number(row.score ?? 0),
      }));
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
          ErrorCode.SEARCH_QUERY_FAILED,
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
