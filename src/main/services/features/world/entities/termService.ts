/**
 * Term service - 고유명사 사전 관리 비즈니스 로직
 */

import { eq, isNull, like, or, asc, and, inArray } from "drizzle-orm";
import { db } from "../../../../infra/database/index.js";
import { term, entityRelation } from "../../../../infra/database/index.js";
import { createLogger } from "../../../../../shared/logger/index.js";
import { ErrorCode } from "../../../../../shared/constants/index.js";
import type {
  TermCreateInput,
  TermUpdateInput,
  TermAppearanceInput,
} from "../../../../../shared/types/index.js";
import { rebuildProjectKeywordAppearances } from "../../manuscript/chapterKeywords.js";
import { projectService } from "../../project/projectService.js";
import { ServiceError } from "../../../../utils/error/index.js";
import { escapeLike } from "../../../../utils/query/index.js";

const loadAppearanceCacheService = async () =>
  (await import("../cache/appearanceCacheService.js")).appearanceCacheService;

const logger = createLogger("TermService");

export class TermService {
  async createTerm(input: TermCreateInput) {
    try {
      logger.info("Creating term", input);

      const now = new Date().toISOString();
      const [result] = await db
        .getClient()
        .insert(term)
        .values({
          id: crypto.randomUUID(),
          projectId: input.projectId,
          term: input.term,
          definition: input.definition ?? null,
          category: input.category ?? null,
          order: input.order ?? 0,
          firstAppearance: input.firstAppearance ?? null,
          updatedAt: now,
        })
        .returning();

      if (!result) {
        throw new ServiceError(
          ErrorCode.TERM_CREATE_FAILED,
          "Failed to create term",
          { input },
        );
      }

      logger.info("Term created successfully", { termId: result.id });
      await rebuildProjectKeywordAppearances(input.projectId, {
        includeCharacters: false,
        includeTerms: true,
      });
      await projectService.touchProject(input.projectId);
      await projectService.persistPackageAfterMutation(
        input.projectId,
        "term:create",
      );
      return result;
    } catch (error) {
      logger.error("Failed to create term", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.TERM_CREATE_FAILED,
        "Failed to create term",
        { input },
        error,
      );
    }
  }

  async getTerm(id: string) {
    try {
      const results = await db
        .getClient()
        .select()
        .from(term)
        .where(eq(term.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", {
          id,
        });
      }
      const t = results[0];
      if (t.deletedAt) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", {
          id,
        });
      }

      const appearanceCacheService = await loadAppearanceCacheService();
      const appearances =
        await appearanceCacheService.getTermAppearancesByEntity(id);
      return {
        ...t,
        appearances,
      };
    } catch (error) {
      logger.error("Failed to get term", error);
      if (error instanceof ServiceError) throw error;
      throw error;
    }
  }

  async getAllTerms(projectId: string) {
    try {
      const results = await db
        .getClient()
        .select()
        .from(term)
        .where(and(eq(term.projectId, projectId), isNull(term.deletedAt)))
        .orderBy(asc(term.term));

      return results;
    } catch (error) {
      logger.error("Failed to get all terms", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get all terms",
        { projectId },
        error,
      );
    }
  }

  async updateTerm(input: TermUpdateInput) {
    try {
      const updateData: Partial<typeof term.$inferInsert> = {};

      if (input.term !== undefined) updateData.term = input.term;
      if (input.definition !== undefined)
        updateData.definition = input.definition;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.order !== undefined) updateData.order = input.order;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;

      const currentResults = await db
        .getClient()
        .select({
          id: term.id,
          projectId: term.projectId,
          deletedAt: term.deletedAt,
        })
        .from(term)
        .where(eq(term.id, input.id))
        .limit(1);
      const current = currentResults[0];
      if (!current || current.deletedAt) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", {
          id: input.id,
        });
      }

      const [updated] = await db
        .getClient()
        .update(term)
        .set(updateData)
        .where(eq(term.id, input.id))
        .returning();

      if (!updated) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", {
          id: input.id,
        });
      }

      logger.info("Term updated successfully", { termId: updated.id });
      if (input.term !== undefined) {
        await rebuildProjectKeywordAppearances(String(updated.projectId), {
          includeCharacters: false,
          includeTerms: true,
        });
      }
      await projectService.touchProject(String(updated.projectId));
      await projectService.persistPackageAfterMutation(
        String(updated.projectId),
        "term:update",
      );
      return updated;
    } catch (error) {
      logger.error("Failed to update term", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.TERM_UPDATE_FAILED,
        "Failed to update term",
        { input },
        error,
      );
    }
  }

  async deleteTerm(id: string) {
    try {
      const currentResults = await db
        .getClient()
        .select({ projectId: term.projectId, deletedAt: term.deletedAt })
        .from(term)
        .where(eq(term.id, id))
        .limit(1);
      const current = currentResults[0];

      const projectId = current?.projectId ?? null;
      const now = new Date().toISOString();

      db.getClient().transaction((tx) => {
        if (projectId) {
          tx.delete(entityRelation)
            .where(
              or(
                eq(entityRelation.sourceId, id),
                eq(entityRelation.targetId, id),
              ),
            )
            .run();
        }
        const result = tx
          .update(term)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(term.id, id))
          .run();
        if (!result) {
          throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", {
            id,
          });
        }
      });
      const appearanceCacheService = await loadAppearanceCacheService();
      await appearanceCacheService.clearTermEntity(id);

      logger.info("Term deleted successfully", { termId: id });
      if (projectId) {
        await projectService.touchProject(projectId);
        await projectService.persistPackageAfterMutation(
          projectId,
          "term:delete",
        );
      }
      return { success: true };
    } catch (error) {
      logger.error("Failed to delete term", error);
      throw new ServiceError(
        ErrorCode.TERM_DELETE_FAILED,
        "Failed to delete term",
        { id },
        error,
      );
    }
  }

  async recordAppearance(input: TermAppearanceInput) {
    try {
      const appearanceCacheService = await loadAppearanceCacheService();
      const appearance =
        await appearanceCacheService.recordTermAppearance(input);

      logger.info("Term appearance recorded", {
        termId: input.termId,
        chapterId: input.chapterId,
      });

      return appearance;
    } catch (error) {
      logger.error("Failed to record term appearance", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to record term appearance",
        { input },
        error,
      );
    }
  }

  async getAppearancesByChapter(chapterId: string) {
    try {
      const appearanceCacheService = await loadAppearanceCacheService();
      const appearances =
        await appearanceCacheService.getTermAppearancesByChapter(chapterId);
      const termIds = Array.from(
        new Set(appearances.map((appearance) => appearance.termId)),
      );
      const terms = await db
        .getClient()
        .select()
        .from(term)
        .where(and(inArray(term.id, termIds), isNull(term.deletedAt)));
      const termById = new Map(terms.map((t) => [t.id, t]));

      return appearances.map((appearance) => ({
        ...appearance,
        term: termById.get(appearance.termId) ?? null,
      }));
    } catch (error) {
      logger.error("Failed to get appearances by chapter", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get term appearances",
        { chapterId },
        error,
      );
    }
  }

  async updateFirstAppearance(termId: string, chapterId: string) {
    try {
      const results = await db
        .getClient()
        .select()
        .from(term)
        .where(eq(term.id, termId))
        .limit(1);
      const t = results[0];

      if (!t || t.deletedAt) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", {
          termId,
        });
      }

      if (!t.firstAppearance) {
        await db
          .getClient()
          .update(term)
          .set({ firstAppearance: chapterId })
          .where(eq(term.id, termId));

        logger.info("First appearance updated", { termId, chapterId });
        await projectService.touchProject(String(t.projectId));
        await projectService.persistPackageAfterMutation(
          String(t.projectId),
          "term:update-first-appearance",
        );
      }
    } catch (error) {
      logger.error("Failed to update first appearance", error);
      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        ErrorCode.TERM_UPDATE_FAILED,
        "Failed to update first appearance",
        { termId, chapterId },
        error,
      );
    }
  }

  async searchTerms(projectId: string, query: string) {
    try {
      const searchPattern = `%${escapeLike(query)}%`;
      const results = await db
        .getClient()
        .select()
        .from(term)
        .where(
          and(
            eq(term.projectId, projectId),
            or(
              like(term.term, searchPattern),
              like(term.definition, searchPattern),
            ),
            isNull(term.deletedAt),
          ),
        )
        .orderBy(asc(term.term));

      return results;
    } catch (error) {
      logger.error("Failed to search terms", error);
      throw new ServiceError(
        ErrorCode.SEARCH_QUERY_FAILED,
        "Failed to search terms",
        { projectId, query },
        error,
      );
    }
  }

  async getTermsByCategory(projectId: string, category: string) {
    try {
      const results = await db
        .getClient()
        .select()
        .from(term)
        .where(
          and(
            eq(term.projectId, projectId),
            eq(term.category, category),
            isNull(term.deletedAt),
          ),
        )
        .orderBy(asc(term.term));

      return results;
    } catch (error) {
      logger.error("Failed to get terms by category", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get terms by category",
        { projectId, category },
        error,
      );
    }
  }
}

export const termService = new TermService();
