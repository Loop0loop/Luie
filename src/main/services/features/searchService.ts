/**
 * Search service - 통합 검색 (고유명사 우선)
 */

import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { db } from "../../infra/database/index.js";
import { character, memoryChunk, term } from "../../infra/database/index.js";
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
import { utilityProcessBridge } from "./utility/utilityProcessBridge.js";
import {
  buildFtsQuery,
  mergeWithRRF,
  searchByShortTokens,
  searchByVector,
  shouldRunVectorSearch,
} from "./search/index.js";

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
      const ftsQuery = buildFtsQuery(normalizedQuery);
      const ftsRows = ftsQuery.length > 0
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

      // trigram 으로 잡히지 않는 2자 이하 토큰(인물명 등)을 LIKE 로 보완.
      const lexicalRanks = await searchByShortTokens(
        input.projectId,
        normalizedQuery,
        Math.max(limit, 50),
        logger,
      );

      let denseRanks: Array<{ chunkId: string; rank: number }> = [];
      if (shouldRunVectorSearch()) {
        // 임베딩 미가용(런타임 해석 실패/embed null/예외)이어도 FTS(+LIKE) 폴백을
        // 보장한다(P2). 이 블록은 절대 throw 를 바깥으로 전파하지 않는다.
        try {
          const vecs = await utilityProcessBridge.embed(input.projectId, [normalizedQuery]);
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
          ftsRows.map((row, index) => ({ chunkId: row.chunkId, rank: index + 1 })),
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
