import crypto from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../../database/index.js";
import { chapter, chapterRevision } from "../../../database/schema.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../../../shared/types/index.js";
import { ServiceError } from "../../../utils/serviceError.js";
import { projectService } from "../projectService.js";
import { applyChapterContentUpdate } from "./chapterContentValidation.js";
import {
  hashChapterContent,
  readChapterContent,
  upsertChapterBody,
} from "./chapterContentStore.js";
import { enqueueChapterDerivedJobs } from "./chapterDerivedJobs.js";
import {
  chapterLogger as logger,
  fireAndForget,
  logTrace,
  perfNow,
  SKIP_DERIVED_ENQUEUE_ON_STRESS,
  SKIP_NONCRITICAL_DERIVED_ON_STRESS,
  SUPPRESS_HOT_PATH_INFO_LOGS,
} from "./chapterRuntime.js";

const loadChapterSearchCacheService = async () =>
  (await import("../../features/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

type RunInWriteSerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

export const createChapterRecord = async (input: {
  data: ChapterCreateInput;
  runInWriteSerialQueue: RunInWriteSerialQueue;
}) => {
  const { data } = input;
  try {
    const startedAt = perfNow();
    if (!data.title || data.title.trim().length === 0) {
      throw new ServiceError(
        ErrorCode.REQUIRED_FIELD_MISSING,
        "Chapter title is required",
        { input: data },
      );
    }
    logger.info("Creating chapter", data);

    const store = db.getClient();
    const maxOrderRows = await store
      .select({ order: chapter.order })
      .from(chapter)
      .where(and(eq(chapter.projectId, data.projectId), isNull(chapter.deletedAt)))
      .orderBy(desc(chapter.order))
      .limit(1);

    const maxOrderValue =
      maxOrderRows.length > 0 && typeof maxOrderRows[0].order === "number"
        ? maxOrderRows[0].order
        : 0;
    const nextOrder = data.order ?? maxOrderValue + 1;

    if (data.clientMutationId) {
      const existingRows = await store
        .select()
        .from(chapter)
        .where(eq(chapter.id, data.clientMutationId))
        .limit(1);
      if (existingRows.length > 0) return existingRows[0];
    }

    const now = new Date().toISOString();
    const chapterId = data.clientMutationId ?? crypto.randomUUID();
    const created = await input.runInWriteSerialQueue(async () => {
      await store.run(sql`BEGIN IMMEDIATE;`);
      try {
        const inserted = await store.insert(chapter).values({
          id: chapterId,
          projectId: data.projectId,
          title: data.title,
          synopsis: data.synopsis ?? null,
          order: nextOrder,
          content: "",
          createdAt: now,
          updatedAt: now,
        }).returning();
        const createdRow = inserted[0];
        if (!createdRow) {
          throw new Error("Chapter create transaction completed without inserted row");
        }
        await upsertChapterBody({
          chapterId: String(createdRow.id),
          content: String(createdRow.content ?? ""),
          now,
        });
        await enqueueChapterDerivedJobs({
          projectId: String(createdRow.projectId),
          chapterId: String(createdRow.id),
          reason: "chapter:create",
        });
        await store.run(sql`COMMIT;`);
        return createdRow;
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

    const insertedAt = perfNow();
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
    await projectService.persistPackageAfterMutation(data.projectId, "chapter:create");
    const persistedAt = perfNow();
    logTrace("chapter.create", String(created.id), {
      totalMs: persistedAt - startedAt,
      insertMs: insertedAt - startedAt,
      bodyUpsertMs: 0,
      queueMs: 0,
      cacheDispatchMs: cacheDeferredAt - insertedAt,
      persistMs: persistedAt - cacheDeferredAt,
    });
    return created;
  } catch (error) {
    logger.error("Failed to create chapter", error);
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.CHAPTER_CREATE_FAILED,
      "Failed to create chapter",
      { input: data },
      error,
    );
  }
};

export const updateChapterRecord = async (input: {
  data: ChapterUpdateInput;
  runInWriteSerialQueue: RunInWriteSerialQueue;
}) => {
  const { data } = input;
  try {
    const startedAt = perfNow();
    const store = db.getClient();
    const currentRows = await store
      .select({ projectId: chapter.projectId, deletedAt: chapter.deletedAt })
      .from(chapter)
      .where(eq(chapter.id, data.id))
      .limit(1);

    const current = currentRows.length > 0 ? currentRows[0] : null;
    if (current?.deletedAt) {
      throw new ServiceError(
        ErrorCode.VALIDATION_FAILED,
        "Cannot update a deleted chapter",
        { id: data.id },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    const persistedContent = await readChapterContent(data.id);
    await applyChapterContentUpdate(
      data,
      { ...(current as object), content: persistedContent } as {
        projectId?: unknown;
        content?: unknown;
      } | null,
      updateData,
    );
    if (data.synopsis !== undefined) updateData.synopsis = data.synopsis;

    if (Object.keys(updateData).length === 0) {
      const existing = await store
        .select()
        .from(chapter)
        .where(eq(chapter.id, data.id))
        .limit(1);
      return existing.length > 0 ? existing[0] : null;
    }

    const hasOnlyContentUpdate =
      Object.keys(updateData).length === 2 &&
      Object.prototype.hasOwnProperty.call(updateData, "content") &&
      Object.prototype.hasOwnProperty.call(updateData, "wordCount");
    if (hasOnlyContentUpdate && persistedContent === String(data.content ?? "")) {
      const existing = await store
        .select()
        .from(chapter)
        .where(eq(chapter.id, data.id))
        .limit(1);
      return existing.length > 0 ? existing[0] : null;
    }

    const now = new Date().toISOString();
    const updatedChapter = await input.runInWriteSerialQueue(async () => {
      await store.run(sql`BEGIN IMMEDIATE;`);
      try {
        const updated = await store
          .update(chapter)
          .set({ ...(updateData as Partial<typeof chapter.$inferInsert>), updatedAt: now })
          .where(eq(chapter.id, data.id))
          .returning();

        if (updated.length === 0) {
          throw new ServiceError(
            ErrorCode.CHAPTER_NOT_FOUND,
            "Chapter not found",
            { id: data.id },
          );
        }

        const updatedChapterRow = updated[0];
        if (data.content !== undefined) {
          await upsertChapterBody({
            chapterId: String(updatedChapterRow.id),
            content: data.content,
            now,
          });
          await store.insert(chapterRevision).values({
            id: crypto.randomUUID(),
            chapterId: String(updatedChapterRow.id),
            contentHash: hashChapterContent(data.content),
            content: data.content,
            reason: "manual_save",
            createdAt: now,
          });
        }
        if (!SKIP_DERIVED_ENQUEUE_ON_STRESS) {
          await enqueueChapterDerivedJobs({
            projectId: String(updatedChapterRow.projectId),
            chapterId: String(updatedChapterRow.id),
            reason: "chapter:update",
          });
        }
        await store.run(sql`COMMIT;`);
        return updatedChapterRow;
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

    const rowUpdatedAt = perfNow();
    if (!SUPPRESS_HOT_PATH_INFO_LOGS) {
      logger.info("Chapter updated successfully", {
        chapterId: updatedChapter.id,
      });
    }
    const updateContent =
      data.content ?? await readChapterContent(String(updatedChapter.id));
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
    await projectService.persistPackageAfterMutation(
      String(updatedChapter.projectId),
      "chapter:update",
    );
    const persistedAt = perfNow();
    logTrace("chapter.update", String(updatedChapter.id), {
      totalMs: persistedAt - startedAt,
      updateRowMs: rowUpdatedAt - startedAt,
      bodyAndRevisionMs: 0,
      queueMs: 0,
      cacheDispatchMs: cacheDispatchedAt - rowUpdatedAt,
      persistMs: persistedAt - cacheDispatchedAt,
    });
    return {
      ...updatedChapter,
      content: await readChapterContent(String(updatedChapter.id)),
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
    if (error instanceof ServiceError) throw error;
    throw new ServiceError(
      ErrorCode.CHAPTER_UPDATE_FAILED,
      "Failed to update chapter",
      { input: data },
      error,
    );
  }
};
