import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { ErrorCode } from "../../../../shared/constants/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import type { SearchQuery } from "../../../../shared/types/index.js";
import { character, term } from "../../../database/schema/index.js";
import { db } from "../../../database/main/databaseService.js";
import { escapeLike } from "../../../utils/query/index.js";
import { ServiceError } from "../../../utils/error/index.js";

const loadChapterSearchCacheService = async () =>
  (await import("../chapterSearchCacheService.js")).chapterSearchCacheService;

const logger = createLogger("SearchService");

export interface SearchResult {
  type: "character" | "term" | "chapter";
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export async function searchProject(
  input: SearchQuery,
): Promise<SearchResult[]> {
  try {
    const results: SearchResult[] = [];
    const escapedQuery = escapeLike(input.query);

    if (input.type === "all" || input.type === "character") {
      const characters = await db
        .getClient()
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
      const terms = await db
        .getClient()
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

export async function getQuickAccess(
  projectId: string,
): Promise<SearchResult[]> {
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
      .where(
        and(eq(character.projectId, projectId), isNull(character.deletedAt)),
      )
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
