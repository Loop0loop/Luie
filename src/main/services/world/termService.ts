/**
 * Term service - 고유명사 사전 관리 비즈니스 로직
 */

import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode } from "../../../shared/constants/index.js";
import type {
  TermCreateInput,
  TermUpdateInput,
  TermAppearanceInput,
} from "../../../shared/types/index.js";
import { projectService } from "../core/projectService.js";
import { ServiceError } from "../../utils/serviceError.js";

const logger = createLogger("TermService");

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}

export class TermService {
  async createTerm(input: TermCreateInput) {
    try {
      logger.info("Creating term", input);

      const term = await db.getClient().term.create({
        data: {
          projectId: input.projectId,
          term: input.term,
          definition: input.definition,
          category: input.category,
          order: input.order,
          firstAppearance: input.firstAppearance,
        },
      });

      logger.info("Term created successfully", { termId: term.id });
      projectService.schedulePackageExport(input.projectId, "term:create");
      return term;
    } catch (error) {
      logger.error("Failed to create term", error);
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
      const term = await db.getClient().term.findUnique({
        where: { id },
        include: {
          appearances: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!term) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", { id });
      }

      return term;
    } catch (error) {
      logger.error("Failed to get term", error);
      throw error;
    }
  }

  async getAllTerms(projectId: string) {
    try {
      const terms = await db.getClient().term.findMany({
        where: { projectId },
        orderBy: { term: "asc" },
        include: {
          _count: {
            select: {
              appearances: true,
            },
          },
        },
      });

      return terms;
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
      const updateData: Record<string, unknown> = {};

      if (input.term !== undefined) updateData.term = input.term;
      if (input.definition !== undefined) updateData.definition = input.definition;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.order !== undefined) updateData.order = input.order;
      if (input.firstAppearance !== undefined)
        updateData.firstAppearance = input.firstAppearance;

      const term = await db.getClient().term.update({
        where: { id: input.id },
        data: updateData,
      });

      logger.info("Term updated successfully", { termId: term.id });
      projectService.schedulePackageExport(String(term.projectId), "term:update");
      return term;
    } catch (error) {
      logger.error("Failed to update term", error);
      if (isPrismaNotFoundError(error)) {
        throw new ServiceError(
          ErrorCode.TERM_NOT_FOUND,
          "Term not found",
          { id: input.id },
          error,
        );
      }
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
      const term = await db.getClient().term.findUnique({
        where: { id },
        select: { projectId: true },
      });

      await db.getClient().term.deleteMany({ where: { id } });

      logger.info("Term deleted successfully", { termId: id });
      if (term?.projectId) {
        projectService.schedulePackageExport(String(term.projectId), "term:delete");
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
      const appearance = await db.getClient().termAppearance.create({
        data: {
          termId: input.termId,
          chapterId: input.chapterId,
          position: input.position,
          context: input.context,
        },
      });

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
      const appearances = await db.getClient().termAppearance.findMany({
        where: { chapterId },
        include: {
          term: true,
        },
        orderBy: { position: "asc" },
      });

      return appearances;
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
      const term = await db.getClient().term.findUnique({
        where: { id: termId },
      });

      if (!term) {
        throw new ServiceError(ErrorCode.TERM_NOT_FOUND, "Term not found", { termId });
      }

      if (!term.firstAppearance) {
        await db.getClient().term.update({
          where: { id: termId },
          data: { firstAppearance: chapterId },
        });

        logger.info("First appearance updated", { termId, chapterId });
      }
    } catch (error) {
      logger.error("Failed to update first appearance", error);
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
      const terms = await db.getClient().term.findMany({
        where: {
          projectId,
          OR: [{ term: { contains: query } }, { definition: { contains: query } }],
        },
        orderBy: { term: "asc" },
      });

      return terms;
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
      const terms = await db.getClient().term.findMany({
        where: {
          projectId,
          category,
        },
        orderBy: { term: "asc" },
      });

      return terms;
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
