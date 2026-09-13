import crypto from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import { chapter, chapterRevision } from "../../../infra/database/index.js";
import type { MainDrizzleClient } from "../../../infra/database/index.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../../../shared/types/index.js";
import { ServiceError } from "../../../utils/error/index.js";
import { projectService } from "../../features/project/projectService.js";
import { applyChapterContentUpdate } from "./chapterContentValidation.js";
import {
  hashChapterContent,
  readChapterContent,
  upsertChapterBody,
} from "./chapterContentStore.js";
import { enqueueChapterDerivedJobs } from "./chapterDerivedJobs.js";
import { trackKeywordAppearances } from "../../features/manuscript/chapterKeywords.js";
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
  (await import("../../features/search/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

type RunInWriteSerialQueue = <T>(task: () => Promise<T>) => Promise<T>;
export type ChapterRevisionReason = "autosave" | "manual_save";

const AUTOSAVE_REVISION_COALESCE_MS = 5 * 60 * 1000;
const MAX_CHAPTER_REVISIONS = 100;
type ChapterRevisionStore = Pick<
  MainDrizzleClient,
  "select" | "insert" | "update" | "delete" | "all"
>;

const persistChapterRevision = (input: {
  tx: ChapterRevisionStore;
  chapterId: string;
  content: string;
  contentHash: string;
  reason: ChapterRevisionReason;
  now: string;
}) => {
  const latest = input.tx
    .select()
    .from(chapterRevision)
    .where(eq(chapterRevision.chapterId, input.chapterId))
    .orderBy(desc(chapterRevision.createdAt), desc(chapterRevision.id))
    .limit(1)
    .get();
  const latestCreatedAt = latest ? Date.parse(latest.createdAt) : NaN;
  const shouldCoalesce =
    input.reason === "autosave" &&
    latest?.reason === "autosave" &&
    Number.isFinite(latestCreatedAt) &&
    Date.parse(input.now) - latestCreatedAt < AUTOSAVE_REVISION_COALESCE_MS;

  if (shouldCoalesce && latest) {
    input.tx
      .update(chapterRevision)
      .set({
        content: input.content,
        contentHash: input.contentHash,
        createdAt: input.now,
      })
      .where(eq(chapterRevision.id, latest.id))
      .run();
  } else {
    input.tx
      .insert(chapterRevision)
      .values({
        id: crypto.randomUUID(),
        chapterId: input.chapterId,
        contentHash: input.contentHash,
        content: input.content,
        reason: input.reason,
        createdAt: input.now,
      })
      .run();
  }

  const expired = input.tx.all<{ id: string }>(
    sql`SELECT "id" FROM "ChapterRevision"
        WHERE "chapterId" = ${input.chapterId}
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT -1 OFFSET ${MAX_CHAPTER_REVISIONS};`,
  );
  if (expired.length > 0) {
    input.tx
      .delete(chapterRevision)
      .where(
        inArray(
          chapterRevision.id,
          expired.map((row) => row.id),
        ),
      )
      .run();
  }
};

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
      .where(
        and(eq(chapter.projectId, data.projectId), isNull(chapter.deletedAt)),
      )
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
    const initialContent = "";
    const initialContentHash = hashChapterContent(initialContent);
    const created = await input.runInWriteSerialQueue(async () =>
      store.transaction(
        (tx) => {
          const createdRow = tx
            .insert(chapter)
            .values({
              id: chapterId,
              projectId: data.projectId,
              title: data.title,
              synopsis: data.synopsis ?? null,
              order: nextOrder,
              content: initialContent,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
            .get();
          if (!createdRow) {
            throw new Error(
              "Chapter create transaction completed without inserted row",
            );
          }
          upsertChapterBody({
            chapterId: String(createdRow.id),
            content: initialContent,
            contentHash: initialContentHash,
            now,
            tx,
          });
          enqueueChapterDerivedJobs({
            projectId: String(createdRow.projectId),
            chapterId: String(createdRow.id),
            reason: "chapter:create",
            tx,
          });
          return createdRow;
        },
        { behavior: "immediate" },
      ),
    );

    const insertedAt = perfNow();
    if (!SUPPRESS_HOT_PATH_INFO_LOGS) {
      logger.info("Chapter created successfully", { chapterId: created.id });
    }
    if (!SKIP_NONCRITICAL_DERIVED_ON_STRESS) {
      fireAndForget(
        (async () => {
          const chapterSearchCacheService =
            await loadChapterSearchCacheService();
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
    await projectService.persistPackageAfterMutation(
      data.projectId,
      "chapter:create",
    );
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
  revisionReason?: ChapterRevisionReason;
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
    if (
      hasOnlyContentUpdate &&
      persistedContent === String(data.content ?? "")
    ) {
      if (current?.projectId) {
        await projectService.persistPackageAfterMutation(
          String(current.projectId),
          "chapter:update",
          {
            chapterContent: {
              chapterId: data.id,
              content: persistedContent,
            },
          },
        );
      }
      const existing = await store
        .select()
        .from(chapter)
        .where(eq(chapter.id, data.id))
        .limit(1);
      return existing.length > 0 ? existing[0] : null;
    }

    const now = new Date().toISOString();
    const preparedContent =
      data.content === undefined
        ? null
        : {
            value: data.content,
            hash: hashChapterContent(data.content),
          };
    const updatedChapter = await input.runInWriteSerialQueue(async () =>
      store.transaction(
        (tx) => {
          const updatedChapterRow = tx
            .update(chapter)
            .set({
              ...(updateData as Partial<typeof chapter.$inferInsert>),
              updatedAt: now,
            })
            .where(eq(chapter.id, data.id))
            .returning()
            .get();

          if (!updatedChapterRow) {
            throw new ServiceError(
              ErrorCode.CHAPTER_NOT_FOUND,
              "Chapter not found",
              { id: data.id },
            );
          }

          if (preparedContent) {
            upsertChapterBody({
              chapterId: String(updatedChapterRow.id),
              content: preparedContent.value,
              contentHash: preparedContent.hash,
              now,
              tx,
            });
            persistChapterRevision({
              tx,
              chapterId: String(updatedChapterRow.id),
              contentHash: preparedContent.hash,
              content: preparedContent.value,
              reason: input.revisionReason ?? "manual_save",
              now,
            });
          }
          if (!SKIP_DERIVED_ENQUEUE_ON_STRESS) {
            enqueueChapterDerivedJobs({
              projectId: String(updatedChapterRow.projectId),
              chapterId: String(updatedChapterRow.id),
              reason: "chapter:update",
              tx,
            });
          }
          return updatedChapterRow;
        },
        { behavior: "immediate" },
      ),
    );

    const rowUpdatedAt = perfNow();
    if (preparedContent && !SKIP_NONCRITICAL_DERIVED_ON_STRESS) {
      fireAndForget(
        trackKeywordAppearances(
          String(updatedChapter.id),
          preparedContent.value,
          String(updatedChapter.projectId),
        ),
        "chapter:update:track-keyword-appearances",
      );
    }
    if (!SUPPRESS_HOT_PATH_INFO_LOGS) {
      logger.info("Chapter updated successfully", {
        chapterId: updatedChapter.id,
      });
    }
    const updateContent =
      data.content ?? (await readChapterContent(String(updatedChapter.id)));
    if (!SKIP_NONCRITICAL_DERIVED_ON_STRESS) {
      fireAndForget(
        (async () => {
          const chapterSearchCacheService =
            await loadChapterSearchCacheService();
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
      hasOnlyContentUpdate && preparedContent
        ? {
            chapterContent: {
              chapterId: String(updatedChapter.id),
              content: preparedContent.value,
            },
          }
        : undefined,
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
