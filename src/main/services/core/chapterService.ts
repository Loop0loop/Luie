/**
 * Chapter service - 챕터/회차 관리 비즈니스 로직
 */

import { app } from "electron";
import * as fs from "fs/promises";
import path from "path";
import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";
import { ErrorCode, SNAPSHOT_BACKUP_DIR } from "../../../shared/constants/index.js";
import type { ChapterCreateInput, ChapterUpdateInput } from "../../../shared/types/index.js";
import { autoExtractService } from "../features/autoExtractService.js";
import { projectService } from "./projectService.js";
import { ServiceError } from "../../utils/serviceError.js";
import { trackKeywordAppearances } from "./chapterKeywords.js";
import { sanitizeName } from "../../../shared/utils/sanitize.js";

const logger = createLogger("ChapterService");

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2025"
  );
}

export class ChapterService {
  async createChapter(input: ChapterCreateInput) {
    try {
      if (!input.title || input.title.trim().length === 0) {
        throw new ServiceError(
          ErrorCode.REQUIRED_FIELD_MISSING,
          "Chapter title is required",
          { input },
        );
      }
      logger.info("Creating chapter", input);

      const maxOrder = await db.getClient().chapter.findFirst({
        where: { projectId: input.projectId, deletedAt: null },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const maxOrderValue =
        typeof (maxOrder as { order?: unknown })?.order === "number"
          ? (maxOrder as { order: number }).order
          : 0;
      const nextOrder = input.order ?? maxOrderValue + 1;

      const chapter = await db.getClient().chapter.create({
        data: {
          projectId: input.projectId,
          title: input.title,
          synopsis: input.synopsis,
          order: nextOrder,
          content: "",
        },
      });

      logger.info("Chapter created successfully", { chapterId: chapter.id });
      projectService.schedulePackageExport(input.projectId, "chapter:create");
      return chapter;
    } catch (error) {
      logger.error("Failed to create chapter", error);
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError(
        ErrorCode.CHAPTER_CREATE_FAILED,
        "Failed to create chapter",
        { input },
        error,
      );
    }
  }

  async getChapter(id: string) {
    try {
      const chapter = await db.getClient().chapter.findFirst({
        where: { id, deletedAt: null },
      });

      if (!chapter) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
        );
      }

      return chapter;
    } catch (error) {
      logger.error("Failed to get chapter", error);
      throw error;
    }
  }

  async getAllChapters(projectId: string) {
    try {
      const chapters = await db.getClient().chapter.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { order: "asc" },
      });

      return chapters;
    } catch (error) {
      logger.error("Failed to get all chapters", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get all chapters",
        { projectId },
        error,
      );
    }
  }

  async updateChapter(input: ChapterUpdateInput) {
    try {
      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) {
        const isTest = process.env.VITEST === "true" || process.env.NODE_ENV === "test";
        const current = await db.getClient().chapter.findUnique({
          where: { id: input.id },
          select: { projectId: true, content: true },
        });

        const oldContent = typeof current?.content === "string" ? current.content : "";
        const oldLen = oldContent.length;
        const newLen = input.content.length;

        if (!isTest && oldLen > 1000 && newLen < oldLen * 0.1) {
          const project = current?.projectId
            ? await db.getClient().project.findUnique({
                where: { id: String(current.projectId) },
                select: { title: true },
              })
            : null;

          const projectTitle =
            typeof (project as { title?: unknown } | null)?.title === "string"
              ? String((project as { title: string }).title)
              : "Unknown";
          const safeTitle = sanitizeName(projectTitle, "Unknown");
          const dumpDir = path.join(
            app.getPath("userData"),
            SNAPSHOT_BACKUP_DIR,
            safeTitle || "Unknown",
            "_suspicious",
          );
          await fs.mkdir(dumpDir, { recursive: true });
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const dumpPath = path.join(dumpDir, `dump-${input.id}-${timestamp}.txt`);
          await fs.writeFile(dumpPath, input.content, "utf8");

          logger.warn("Suspicious large deletion detected. Save blocked.", {
            chapterId: input.id,
            oldLen,
            newLen,
            dumpPath,
          });

          throw new ServiceError(
            ErrorCode.VALIDATION_FAILED,
            "Suspicious large deletion detected; save blocked",
            { chapterId: input.id, oldLen, newLen },
          );
        }

        updateData.content = input.content;
        updateData.wordCount = input.content.length;

        if (current) {
          await trackKeywordAppearances(
            input.id,
            input.content,
            String((current as { projectId: unknown }).projectId),
          );

          autoExtractService.scheduleAnalysis(
            input.id,
            String((current as { projectId: unknown }).projectId),
            input.content,
          );
        }
      }
      if (input.synopsis !== undefined) updateData.synopsis = input.synopsis;

      const updatedChapter = await db.getClient().chapter.update({
        where: { id: input.id },
        data: updateData,
      });

      logger.info("Chapter updated successfully", {
        chapterId: updatedChapter.id,
      });
      projectService.schedulePackageExport(
        String((updatedChapter as { projectId: unknown }).projectId),
        "chapter:update",
      );
      return updatedChapter;
    } catch (error) {
      logger.error("Failed to update chapter", error);
      if (isPrismaNotFoundError(error)) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id: input.id },
          error,
        );
      }
      throw new ServiceError(
        ErrorCode.CHAPTER_UPDATE_FAILED,
        "Failed to update chapter",
        { input },
        error,
      );
    }
  }

  async deleteChapter(id: string) {
    try {
      const chapter = await db.getClient().chapter.findUnique({
        where: { id },
        select: { projectId: true },
      });

      const deleted = await db.getClient().chapter.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      logger.info("Chapter soft-deleted successfully", { chapterId: id });
      if ((chapter as { projectId?: unknown })?.projectId) {
        projectService.schedulePackageExport(
          String((chapter as { projectId: unknown }).projectId),
          "chapter:delete",
        );
      }
      return deleted;
    } catch (error) {
      logger.error("Failed to delete chapter", error);
      throw new ServiceError(
        ErrorCode.CHAPTER_DELETE_FAILED,
        "Failed to delete chapter",
        { id },
        error,
      );
    }
  }

  async getDeletedChapters(projectId: string) {
    try {
      return await db.getClient().chapter.findMany({
        where: { projectId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      });
    } catch (error) {
      logger.error("Failed to get deleted chapters", error);
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        "Failed to get deleted chapters",
        { projectId },
        error,
      );
    }
  }

  async restoreChapter(id: string) {
    try {
      const current = await db.getClient().chapter.findUnique({
        where: { id },
        select: { projectId: true },
      });

      if (!current?.projectId) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
        );
      }

      const restored = await db.getClient().chapter.update({
        where: { id },
        data: {
          deletedAt: null,
        },
      });

      logger.info("Chapter restored successfully", { chapterId: id });
      projectService.schedulePackageExport(String(current.projectId), "chapter:restore");
      return restored;
    } catch (error) {
      logger.error("Failed to restore chapter", error);
      if (isPrismaNotFoundError(error)) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
          error,
        );
      }
      throw new ServiceError(
        ErrorCode.CHAPTER_UPDATE_FAILED,
        "Failed to restore chapter",
        { id },
        error,
      );
    }
  }

  async purgeChapter(id: string) {
    try {
      const chapter = await db.getClient().chapter.findUnique({
        where: { id },
        select: { projectId: true },
      });

      await db.getClient().chapter.delete({ where: { id } });

      logger.info("Chapter purged successfully", { chapterId: id });
      if ((chapter as { projectId?: unknown })?.projectId) {
        projectService.schedulePackageExport(
          String((chapter as { projectId: unknown }).projectId),
          "chapter:purge",
        );
      }
      return { success: true };
    } catch (error) {
      logger.error("Failed to purge chapter", error);
      throw new ServiceError(
        ErrorCode.CHAPTER_DELETE_FAILED,
        "Failed to purge chapter",
        { id },
        error,
      );
    }
  }

  async reorderChapters(projectId: string, chapterIds: string[]) {
    try {
      await db.getClient().$transaction(
        chapterIds.map((id, index) =>
          db.getClient().chapter.update({
            where: { id },
            data: { order: index + 1 },
          }),
        ),
      );

      logger.info("Chapters reordered successfully", { projectId });
      projectService.schedulePackageExport(projectId, "chapter:reorder");
      return { success: true };
    } catch (error) {
      logger.error("Failed to reorder chapters", error);
      throw new ServiceError(
        ErrorCode.DB_TRANSACTION_FAILED,
        "Failed to reorder chapters",
        { projectId },
        error,
      );
    }
  }
}

export const chapterService = new ChapterService();
