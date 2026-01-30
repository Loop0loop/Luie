/**
 * Search service - 통합 검색 (고유명사 우선)
 */

import { db } from "../database/index.js";
import { createLogger } from "../../shared/logger/index.js";
import type { SearchQuery } from "../../shared/types/index.js";

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

      if (input.type === "all" || input.type === "character") {
        const characters = (await db.getClient().character.findMany({
          where: {
            projectId: input.projectId,
            OR: [
              { name: { contains: input.query } },
              { description: { contains: input.query } },
            ],
          },
          take: 10,
        })) as Array<{ id: string; name: string; description?: string | null }>;

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
        const terms = (await db.getClient().term.findMany({
          where: {
            projectId: input.projectId,
            OR: [
              { term: { contains: input.query } },
              { definition: { contains: input.query } },
            ],
          },
          take: 10,
        })) as Array<{
          id: string;
          term: string;
          definition?: string | null;
          category?: string | null;
        }>;

        terms.forEach((term) => {
          results.push({
            type: "term",
            id: term.id,
            title: term.term,
            description: term.definition ?? undefined,
            metadata: {
              category: term.category ?? undefined,
            },
          });
        });
      }

      if (input.type === "all") {
        const chapters = (await db.getClient().chapter.findMany({
          where: {
            projectId: input.projectId,
            OR: [
              { title: { contains: input.query } },
              { content: { contains: input.query } },
              { synopsis: { contains: input.query } },
            ],
          },
          take: 5,
        })) as Array<{
          id: string;
          title: string;
          synopsis?: string | null;
          wordCount?: number | null;
          order: number;
        }>;

        chapters.forEach((chapter) => {
          results.push({
            type: "chapter",
            id: chapter.id,
            title: chapter.title,
            description: chapter.synopsis ?? undefined,
            metadata: {
              wordCount: chapter.wordCount,
              order: chapter.order,
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
      throw error;
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

  async getQuickAccess(projectId: string) {
    try {
      const recentTerms = (await db.getClient().term.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 5,
      })) as Array<{ id: string; term: string; definition?: string | null }>;

      const recentCharacters = (await db.getClient().character.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 5,
      })) as Array<{ id: string; name: string; description?: string | null }>;

      const results: SearchResult[] = [
        ...recentTerms.map((term) => ({
          type: "term" as const,
          id: term.id,
          title: term.term,
          description: term.definition ?? undefined,
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
      throw error;
    }
  }
}

export const searchService = new SearchService();
