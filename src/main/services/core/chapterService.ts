/**
 * Chapter service - 챕터/회차 관리 비즈니스 로직
 */

import { app } from "electron";
import crypto from "node:crypto";
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

const {
  chapter,
  chapterBody,
  chapterRevision,
  project,
} = schema;

const logger = createLogger("ChapterService");
const ENABLE_STRESS_TRACE =
  process.env.LUIE_STRESS_TRACE === "1" ||
  process.env.LUIE_STRESS_TRACE === "true";
const SKIP_NONCRITICAL_DERIVED_ON_STRESS =
  process.env.LUIE_E2E_STRESS_MODE === "1" ||
  isTestEnv();
const SUPPRESS_HOT_PATH_INFO_LOGS =
  process.env.LUIE_E2E_STRESS_MODE === "1";

const loadAutoSaveManager = async () =>
  (await import("../../manager/autoSaveManager.js")).autoSaveManager;

const loadAppearanceCacheService = async () =>
  (await import("../world/appearanceCacheService.js")).appearanceCacheService;

const loadChapterSearchCacheService = async () =>
  (await import("../features/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

const fireAndForget = (promise: Promise<unknown>, context: string) => {
  void promise.catch((error) => {
    logger.warn(`Deferred task failed: ${context}`, { error });
  });
};

const perfNow = () => Date.now();
const logTrace = (
  op: string,
  chapterId: string,
  checkpoints: Record<string, number>,
) => {
  if (!ENABLE_STRESS_TRACE) return;
  logger.info(`[stress-trace] ${op}`, {
    chapterId,
    ...checkpoints,
  });
};

export class ChapterService {
  private writeSerialQueue: Promise<void> = Promise.resolve();

  private async runInWriteSerialQueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.writeSerialQueue.then(task, task);
    this.writeSerialQueue = next.then(
      () => undefined,
      () => undefined,
    );
    return await next;
  }

  private hashContent(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  private async upsertChapterBody(input: {
    chapterId: string;
    content: string;
    now: string;
    tx?: ReturnType<typeof db.getClient>;
  }): Promise<void> {
    const store = input.tx ?? db.getClient();
    await store
      .insert(chapterBody)
      .values({
        chapterId: input.chapterId,
        content: input.content,
        contentHash: this.hashContent(input.content),
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [chapterBody.chapterId],
        set: {
          content: input.content,
          contentHash: this.hashContent(input.content),
          updatedAt: input.now,
        },
      });
  }

  private async enqueueDerivedJobs(input: {
    projectId: string;
    chapterId: string;
    reason: string;
    tx?: ReturnType<typeof db.getClient>;
  }): Promise<void> {
    const now = new Date().toISOString();
    const store = input.tx ?? db.getClient();
    const pendingSearchRows = await store.all<{ id: string }>(
      sql`SELECT "id" FROM "SearchDirtyQueue"
          WHERE "projectId" = ${input.projectId}
            AND "sourceType" = 'chapter'
            AND "sourceId" = ${input.chapterId}
            AND "status" IN ('pending', 'running')
          ORDER BY "updatedAt" DESC
          LIMIT 1;`,
    );
    if (pendingSearchRows.length > 0) {
      await store.run(
        sql`UPDATE "SearchDirtyQueue"
            SET "reason" = ${input.reason},
                "updatedAt" = ${now}
            WHERE "id" = ${pendingSearchRows[0].id};`,
      );
    } else {
      await store.run(
        sql`INSERT INTO "SearchDirtyQueue" ("id","projectId","sourceType","sourceId","reason","status","attempts","createdAt","updatedAt")
            VALUES (${crypto.randomUUID()}, ${input.projectId}, 'chapter', ${input.chapterId}, ${input.reason}, 'pending', 0, ${now}, ${now});`,
      );
    }

    const pendingMemoryRows = await store.all<{ id: string }>(
      sql`SELECT "id" FROM "MemoryBuildJob"
          WHERE "projectId" = ${input.projectId}
            AND "targetType" = 'chapter'
            AND "targetId" = ${input.chapterId}
            AND "jobType" = 'rebuild_chunks'
            AND "status" IN ('pending', 'running')
          ORDER BY "updatedAt" DESC
          LIMIT 1;`,
    );
    if (pendingMemoryRows.length > 0) {
      await store.run(
        sql`UPDATE "MemoryBuildJob"
            SET "priority" = 100,
                "updatedAt" = ${now}
            WHERE "id" = ${pendingMemoryRows[0].id};`,
      );
    } else {
      await store.run(
        sql`INSERT INTO "MemoryBuildJob" ("id","projectId","targetType","targetId","jobType","status","priority","attempts","createdAt","updatedAt")
            VALUES (${crypto.randomUUID()}, ${input.projectId}, 'chapter', ${input.chapterId}, 'rebuild_chunks', 'pending', 100, 0, ${now}, ${now});`,
      );
    }
  }

  private async readChapterContent(chapterId: string): Promise<string> {
    const store = db.getClient();
    const bodyRows = await store
      .select({ content: chapterBody.content })
      .from(chapterBody)
      .where(eq(chapterBody.chapterId, chapterId))
      .limit(1);
    if (bodyRows.length > 0 && typeof bodyRows[0].content === "string") {
      return bodyRows[0].content;
    }
    const chapterRows = await store
      .select({ content: chapter.content })
      .from(chapter)
      .where(eq(chapter.id, chapterId))
      .limit(1);
    return chapterRows.length > 0 ? String(chapterRows[0].content ?? "") : "";
  }

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

    if (!SKIP_NONCRITICAL_DERIVED_ON_STRESS) {
      fireAndForget(
        trackKeywordAppearances(input.id, input.content, projectId),
        "chapter:update:track-keyword-appearances",
      );
      autoExtractService.scheduleAnalysis(input.id, projectId, input.content);
    }
  }

  async createChapter(input: ChapterCreateInput) {
    try {
      const startedAt = perfNow();
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

      if (input.clientMutationId) {
        const existingRows = await store
          .select()
          .from(chapter)
          .where(eq(chapter.id, input.clientMutationId))
          .limit(1);
        if (existingRows.length > 0) {
          return existingRows[0];
        }
      }

      const now = new Date().toISOString();
      const chapterId = input.clientMutationId ?? crypto.randomUUID();
      let created: typeof chapter.$inferSelect | null = null;
      await this.runInWriteSerialQueue(async () => {
        await store.run(sql`BEGIN IMMEDIATE;`);
        try {
          const inserted = await store.insert(chapter).values({
            id: chapterId,
            projectId: input.projectId,
            title: input.title,
            synopsis: input.synopsis ?? null,
            order: nextOrder,
            content: "",
            createdAt: now,
            updatedAt: now,
          }).returning();
          created = inserted[0];
          await this.upsertChapterBody({
            chapterId: String(created.id),
            content: String(created.content ?? ""),
            now,
          });
          await this.enqueueDerivedJobs({
            projectId: String(created.projectId),
            chapterId: String(created.id),
            reason: "chapter:create",
          });
          await store.run(sql`COMMIT;`);
        } catch (error) {
          try {
            await store.run(sql`ROLLBACK;`);
          } catch (rollbackError) {
            logger.warn("Failed to rollback chapter.create transaction", {
              rollbackError,
            });
          }
          throw error;
        }
      });
      if (!created) {
        throw new Error("Chapter create transaction completed without result");
      }

      const insertedAt = perfNow();
      const bodyUpsertedAt = insertedAt;
      const derivedQueuedAt = insertedAt;

      if (!SUPPRESS_HOT_PATH_INFO_LOGS) {
        logger.info("Chapter created successfully", { chapterId: created.id });
      }
      if (!SKIP_NONCRITICAL_DERIVED_ON_STRESS) {
        fireAndForget(
          (async () => {
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
          })(),
          "chapter:create:search-cache-upsert",
        );
      }
      const cacheDeferredAt = perfNow();
      await projectService.persistPackageAfterMutation(input.projectId, "chapter:create");
      const persistedAt = perfNow();
      logTrace("chapter.create", String(created.id), {
        totalMs: persistedAt - startedAt,
        insertMs: insertedAt - startedAt,
        bodyUpsertMs: bodyUpsertedAt - insertedAt,
        queueMs: derivedQueuedAt - bodyUpsertedAt,
        cacheDispatchMs: cacheDeferredAt - derivedQueuedAt,
        persistMs: persistedAt - cacheDeferredAt,
      });
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
        .select({
          id: chapter.id,
          projectId: chapter.projectId,
          title: chapter.title,
          content: chapter.content,
          synopsis: chapter.synopsis,
          order: chapter.order,
          wordCount: chapter.wordCount,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
          deletedAt: chapter.deletedAt,
        })
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

      const result = rows[0];
      return {
        ...result,
        content: await this.readChapterContent(id),
      };
    } catch (error) {
      logger.error("Failed to get chapter", error);
      throw error;
    }
  }

  async getAllChapters(projectId: string) {
    try {
      const chapters = await db.getClient()
        .select({
          id: chapter.id,
          projectId: chapter.projectId,
          title: chapter.title,
          content: chapter.content,
          synopsis: chapter.synopsis,
          order: chapter.order,
          wordCount: chapter.wordCount,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
          deletedAt: chapter.deletedAt,
        })
        .from(chapter)
        .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)))
        .orderBy(asc(chapter.order));

      return await Promise.all(
        chapters.map(async (item) => ({
          ...item,
          content: await this.readChapterContent(String(item.id)),
        })),
      );
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
      const startedAt = perfNow();
      const store = db.getClient();
      const currentRows = await store
        .select({ projectId: chapter.projectId, deletedAt: chapter.deletedAt })
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
      const persistedContent = await this.readChapterContent(input.id);
      await this.applyContentUpdate(
        input,
        { ...(current as object), content: persistedContent } as {
          projectId?: unknown;
          content?: unknown;
        } | null,
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
        persistedContent === String(input.content ?? "")
      ) {
        const existing = await store
          .select()
          .from(chapter)
          .where(eq(chapter.id, input.id))
          .limit(1);
        return existing.length > 0 ? existing[0] : null;
      }

      const now = new Date().toISOString();
      let updatedChapter: typeof chapter.$inferSelect | null = null;
      await this.runInWriteSerialQueue(async () => {
        await store.run(sql`BEGIN IMMEDIATE;`);
        try {
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

          updatedChapter = updated[0];
          if (input.content !== undefined) {
            await this.upsertChapterBody({
              chapterId: String(updatedChapter.id),
              content: input.content,
              now,
            });
            const contentHash = this.hashContent(input.content);
            await store.insert(chapterRevision).values({
              id: crypto.randomUUID(),
              chapterId: String(updatedChapter.id),
              contentHash,
              content: input.content,
              reason: "manual_save",
              createdAt: now,
            });
          }
          await this.enqueueDerivedJobs({
            projectId: String(updatedChapter.projectId),
            chapterId: String(updatedChapter.id),
            reason: "chapter:update",
          });
          await store.run(sql`COMMIT;`);
        } catch (error) {
          try {
            await store.run(sql`ROLLBACK;`);
          } catch (rollbackError) {
            logger.warn("Failed to rollback chapter.update transaction", {
              rollbackError,
            });
          }
          throw error;
        }
      });
      if (!updatedChapter) {
        throw new Error("Chapter update transaction completed without result");
      }
      const rowUpdatedAt = perfNow();
      const bodyAndRevisionAt = rowUpdatedAt;
      const derivedQueuedAt = rowUpdatedAt;

      if (!SUPPRESS_HOT_PATH_INFO_LOGS) {
        logger.info("Chapter updated successfully", {
          chapterId: updatedChapter.id,
        });
      }
      const updateContent = input.content ?? await this.readChapterContent(String(updatedChapter.id));
      if (!SKIP_NONCRITICAL_DERIVED_ON_STRESS) {
        fireAndForget(
          (async () => {
            const chapterSearchCacheService = await loadChapterSearchCacheService();
            await chapterSearchCacheService.upsertChapter({
              chapterId: String(updatedChapter.id),
              projectId: String(updatedChapter.projectId),
              title: updatedChapter.title,
              synopsis: updatedChapter.synopsis ?? null,
              content: updateContent,
              wordCount: updatedChapter.wordCount,
              order: updatedChapter.order,
            });
          })(),
          "chapter:update:search-cache-upsert",
        );
      }
      const cacheDispatchedAt = perfNow();
      await projectService.persistPackageAfterMutation(String(updatedChapter.projectId), "chapter:update");
      const persistedAt = perfNow();
      logTrace("chapter.update", String(updatedChapter.id), {
        totalMs: persistedAt - startedAt,
        updateRowMs: rowUpdatedAt - startedAt,
        bodyAndRevisionMs: bodyAndRevisionAt - rowUpdatedAt,
        queueMs: derivedQueuedAt - bodyAndRevisionAt,
        cacheDispatchMs: cacheDispatchedAt - derivedQueuedAt,
        persistMs: persistedAt - cacheDispatchedAt,
      });
      return {
        ...updatedChapter,
        content: await this.readChapterContent(String(updatedChapter.id)),
        saveState: {
          type: "saved",
          at: Date.now(),
        },
        derivedSyncState: {
          search: "queued",
          memory: "queued",
        },
      };
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
        .select({ projectId: chapter.projectId })
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

      const restoredContent = await this.readChapterContent(id);
      await trackKeywordAppearances(
        id,
        restoredContent,
        String(current.projectId),
      );
      const chapterSearchCacheService = await loadChapterSearchCacheService();
      await chapterSearchCacheService.upsertChapter({
        chapterId: String(restored[0].id),
        projectId: String(current.projectId),
        title: restored[0].title,
        synopsis: restored[0].synopsis ?? null,
        content: restoredContent,
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
