/**
 * Chapter service - 챕터/회차 관리 비즈니스 로직
 */

import { app } from "electron";
import * as fs from "fs/promises";
import path from "path";
import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import * as schema from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";
import {
  ErrorCode,
  SNAPSHOT_BACKUP_DIR,
} from "../../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../../shared/types/index.js";
import { autoExtractService } from "../features/autoExtract/autoExtractService.js";
import { projectService } from "./projectService.js";
import { ServiceError } from "../../utils/serviceError.js";
import { trackKeywordAppearances } from "./chapterKeywords.js";
import { sanitizeName } from "../../../shared/utils/sanitize.js";
import { isTestEnv } from "../../utils/environment.js";

const { chapter, project } = schema;

const logger = createLogger("ChapterService");

const loadAutoSaveManager = async () =>
  (await import("../../manager/autoSaveManager.js")).autoSaveManager;

const loadAppearanceCacheService = async () =>
  (await import("../world/appearanceCacheService.js")).appearanceCacheService;

const loadChapterSearchCacheService = async () =>
  (await import("../features/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

export class ChapterService {
  private async resolveProjectTitle(
    projectId: string | undefined,
  ): Promise<string> {
    if (!projectId) return "Unknown";
    const rows = await db.getClient()
      .select({ title: project.title })
      .from(project)
      .where(eq(project.id, projectId))
      .limit(1);
    return rows.length > 0 && typeof rows[0].title === "string"
      ? rows[0].title
      : "Unknown";
  }

  private async writeSuspiciousContentDump(input: {
    projectId: string | undefined;
    chapterId: string;
    filePrefix: string;
    content: string;
  }): Promise<string | undefined> {
    if (isTestEnv()) return undefined;
    const projectTitle = await this.resolveProjectTitle(input.projectId);
    const safeTitle = sanitizeName(projectTitle, "Unknown");
    const dumpDir = path.join(
      app.getPath("userData"),
      SNAPSHOT_BACKUP_DIR,
      safeTitle || "Unknown",
      "_suspicious",
    );
    await fs.mkdir(dumpDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dumpPath = path.join(
      dumpDir,
      `${input.filePrefix}-${input.chapterId}-${timestamp}.txt`,
    );
    await fs.writeFile(dumpPath, input.content, "utf8");
    return dumpPath;
  }

  private async applyContentUpdate(
    input: ChapterUpdateInput,
    current: { projectId?: unknown; content?: unknown } | null,
    updateData: Record<string, unknown>,
  ): Promise<void> {
    if (input.content === undefined) return;

    const oldContent =
      typeof current?.content === "string" ? current.content : "";
    const oldLen = oldContent.length;
    const newLen = input.content.length;
    const projectId =
      typeof current?.projectId === "string" ? current.projectId : undefined;

    if (oldLen > 0 && newLen === 0) {
      const dumpPath = await this.writeSuspiciousContentDump({
        projectId,
        chapterId: input.id,
        filePrefix: "dump-empty",
        content: oldContent,
      });
      logger.warn("Empty content save blocked.", {
        chapterId: input.id,
        oldLen,
        dumpPath,
      });
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Empty content save blocked",
        { chapterId: input.id, oldLen },
      );
    }

    if (!isTestEnv() && oldLen > 1000 && newLen < oldLen * 0.1) {
      const dumpPath = await this.writeSuspiciousContentDump({
        projectId,
        chapterId: input.id,
        filePrefix: "dump",
        content: input.content,
      });
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
    if (!projectId) return;

    await trackKeywordAppearances(input.id, input.content, projectId);
    autoExtractService.scheduleAnalysis(input.id, projectId, input.content);
  }

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

      const store = db.getClient();
      const maxOrderRows = await store
        .select({ order: chapter.order })
        .from(chapter)
        .where(and(eq(chapter.projectId, input.projectId), isNull(chapter.deletedAt)))
        .orderBy(desc(chapter.order))
        .limit(1);

      const maxOrderValue =
        maxOrderRows.length > 0 && typeof maxOrderRows[0].order === "number"
          ? maxOrderRows[0].order
          : 0;
      const nextOrder = input.order ?? maxOrderValue + 1;

      const now = new Date().toISOString();
      const inserted = await store.insert(chapter).values({
        id: crypto.randomUUID(),
        projectId: input.projectId,
        title: input.title,
        synopsis: input.synopsis ?? null,
        order: nextOrder,
        content: "",
        createdAt: now,
        updatedAt: now,
      }).returning();

      const created = inserted[0];

      logger.info("Chapter created successfully", { chapterId: created.id });
      const chapterSearchCacheService = await loadChapterSearchCacheService();
      await chapterSearchCacheService.upsertChapter({
        chapterId: String(created.id),
        projectId: String(created.projectId),
        title: created.title,
        synopsis: created.synopsis ?? null,
        content: created.content,
        wordCount: created.wordCount,
        order: created.order,
      });
      await projectService.persistPackageAfterMutation(input.projectId, "chapter:create");
      return created;
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
      const store = db.getClient();
      const rows = await store
        .select()
        .from(chapter)
        .where(and(eq(chapter.id, id), isNull(chapter.deletedAt)))
        .limit(1);

      if (rows.length === 0) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
        );
      }

      return rows[0];
    } catch (error) {
      logger.error("Failed to get chapter", error);
      throw error;
    }
  }

  async getAllChapters(projectId: string) {
    try {
      const chapters = await db.getClient()
        .select()
        .from(chapter)
        .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)))
        .orderBy(asc(chapter.order));

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
      const store = db.getClient();
      const currentRows = await store
        .select({ projectId: chapter.projectId, content: chapter.content, deletedAt: chapter.deletedAt })
        .from(chapter)
        .where(eq(chapter.id, input.id))
        .limit(1);

      const current = currentRows.length > 0 ? currentRows[0] : null;
      if (current?.deletedAt) {
        throw new ServiceError(
          ErrorCode.VALIDATION_FAILED,
          "Cannot update a deleted chapter",
          { id: input.id },
        );
      }

      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      await this.applyContentUpdate(
        input,
        current as { projectId?: unknown; content?: unknown } | null,
        updateData,
      );
      if (input.synopsis !== undefined) updateData.synopsis = input.synopsis;

      if (Object.keys(updateData).length === 0) {
        const existing = await store
          .select()
          .from(chapter)
          .where(eq(chapter.id, input.id))
          .limit(1);
        return existing.length > 0 ? existing[0] : null;
      }

      const hasOnlyContentUpdate =
        Object.keys(updateData).length === 2 &&
        Object.prototype.hasOwnProperty.call(updateData, "content") &&
        Object.prototype.hasOwnProperty.call(updateData, "wordCount");

      if (
        hasOnlyContentUpdate &&
        String(current?.content ?? "") === String(input.content ?? "")
      ) {
        const existing = await store
          .select()
          .from(chapter)
          .where(eq(chapter.id, input.id))
          .limit(1);
        return existing.length > 0 ? existing[0] : null;
      }

      const now = new Date().toISOString();
      const updated = await store
        .update(chapter)
        .set({ ...(updateData as Partial<typeof chapter.$inferInsert>), updatedAt: now })
        .where(eq(chapter.id, input.id))
        .returning();

      if (updated.length === 0) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id: input.id },
        );
      }

      const updatedChapter = updated[0];

      logger.info("Chapter updated successfully", {
        chapterId: updatedChapter.id,
      });
      const chapterSearchCacheService = await loadChapterSearchCacheService();
      await chapterSearchCacheService.upsertChapter({
        chapterId: String(updatedChapter.id),
        projectId: String(updatedChapter.projectId),
        title: updatedChapter.title,
        synopsis: updatedChapter.synopsis ?? null,
        content: updatedChapter.content,
        wordCount: updatedChapter.wordCount,
        order: updatedChapter.order,
      });
      await projectService.persistPackageAfterMutation(String(updatedChapter.projectId), "chapter:update");
      return updatedChapter;
    } catch (error) {
      logger.error("Failed to update chapter", error);
      if (error instanceof ServiceError) {
        throw error;
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
      const store = db.getClient();
      const chapterRows = await store
        .select({ projectId: chapter.projectId })
        .from(chapter)
        .where(eq(chapter.id, id))
        .limit(1);

      const chapterData = chapterRows.length > 0 ? chapterRows[0] : null;

      const deleted = await store
        .update(chapter)
        .set({ deletedAt: new Date().toISOString() })
        .where(eq(chapter.id, id))
        .returning();

      if (deleted.length === 0) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
        );
      }

      if (chapterData?.projectId) {
        const autoSaveManager = await loadAutoSaveManager();
        await autoSaveManager.forgetChapter(
          String(chapterData.projectId),
          id,
        );
      }
      const [appearanceCacheService, chapterSearchCacheService] =
        await Promise.all([
          loadAppearanceCacheService(),
          loadChapterSearchCacheService(),
        ]);
      await appearanceCacheService.clearChapter(id);
      await chapterSearchCacheService.clearChapter(id);

      logger.info("Chapter soft-deleted successfully", { chapterId: id });
      if (chapterData?.projectId) {
        await projectService.persistPackageAfterMutation(String(chapterData.projectId), "chapter:delete");
      }
      return deleted[0];
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
      return await db.getClient()
        .select()
        .from(chapter)
        .where(and(eq(chapter.projectId, projectId), sql`${chapter.deletedAt} IS NOT NULL`))
        .orderBy(desc(chapter.deletedAt));
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
      const store = db.getClient();
      const currentRows = await store
        .select({ projectId: chapter.projectId, content: chapter.content })
        .from(chapter)
        .where(eq(chapter.id, id))
        .limit(1);

      const current = currentRows.length > 0 ? currentRows[0] : null;
      if (!current?.projectId) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
        );
      }

      const restored = await store
        .update(chapter)
        .set({ deletedAt: null })
        .where(eq(chapter.id, id))
        .returning();

      if (restored.length === 0) {
        throw new ServiceError(
          ErrorCode.CHAPTER_NOT_FOUND,
          "Chapter not found",
          { id },
        );
      }

      await trackKeywordAppearances(
        id,
        String(current.content ?? ""),
        String(current.projectId),
      );
      const chapterSearchCacheService = await loadChapterSearchCacheService();
      await chapterSearchCacheService.upsertChapter({
        chapterId: String(restored[0].id),
        projectId: String(current.projectId),
        title: restored[0].title,
        synopsis: restored[0].synopsis ?? null,
        content: restored[0].content,
        wordCount: restored[0].wordCount,
        order: restored[0].order,
      });

      logger.info("Chapter restored successfully", { chapterId: id });
      await projectService.persistPackageAfterMutation(String(current.projectId), "chapter:restore");
      return restored[0];
    } catch (error) {
      logger.error("Failed to restore chapter", error);
      if (error instanceof ServiceError) {
        throw error;
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
      const store = db.getClient();
      const chapterRows = await store
        .select({ projectId: chapter.projectId })
        .from(chapter)
        .where(eq(chapter.id, id))
        .limit(1);

      const chapterData = chapterRows.length > 0 ? chapterRows[0] : null;

      await store
        .delete(chapter)
        .where(eq(chapter.id, id));

      const [appearanceCacheService, chapterSearchCacheService] =
        await Promise.all([
          loadAppearanceCacheService(),
          loadChapterSearchCacheService(),
        ]);
      await appearanceCacheService.clearChapter(id);
      await chapterSearchCacheService.clearChapter(id);

      if (chapterData?.projectId) {
        const autoSaveManager = await loadAutoSaveManager();
        await autoSaveManager.forgetChapter(
          String(chapterData.projectId),
          id,
        );
      }

      logger.info("Chapter purged successfully", { chapterId: id });
      if (chapterData?.projectId) {
        await projectService.persistPackageAfterMutation(String(chapterData.projectId), "chapter:purge");
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
      const store = db.getClient();
      store.transaction((tx) => {
        const now = new Date().toISOString();
        for (let index = 0; index < chapterIds.length; index++) {
          const id = chapterIds[index];
          tx
            .update(chapter)
            .set({ order: index + 1, updatedAt: now })
            .where(eq(chapter.id, id))
            .run();
        }
      });

      logger.info("Chapters reordered successfully", { projectId });
      const chapterSearchCacheService = await loadChapterSearchCacheService();
      await chapterSearchCacheService.rebuildProject(projectId);
      await projectService.persistPackageAfterMutation(projectId, "chapter:reorder");
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
