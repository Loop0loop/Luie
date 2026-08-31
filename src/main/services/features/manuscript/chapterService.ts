import { eq, and, isNull, desc, asc, inArray, sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterUpdateInput,
} from "../../../../shared/types/index.js";
import { projectService } from "../project/projectService.js";
import { ServiceError } from "../../../utils/error/index.js";
import { trackKeywordAppearances } from "./chapterKeywords.js";
import { readChapterContent } from "../../core/chapter/chapterContentStore.js";
import {
  createChapterRecord,
  updateChapterRecord,
} from "../../core/chapter/chapterWriteOperations.js";
import { chapterLogger as logger } from "../../core/chapter/chapterRuntime.js";

const { chapter, chapterBody } = schema;

const loadAutoSaveManager = async () =>
  (await import("../../../manager/autoSave/index.js")).autoSaveManager;

const loadAppearanceCacheService = async () =>
  (await import("../world/cache/appearanceCacheService.js")).appearanceCacheService;

const loadChapterSearchCacheService = async () =>
  (await import("../search/chapterSearchCacheService.js"))
    .chapterSearchCacheService;

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

  async createChapter(input: ChapterCreateInput) {
    return await createChapterRecord({
      data: input,
      runInWriteSerialQueue: (task) => this.runInWriteSerialQueue(task),
    });
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
        content: await readChapterContent(id),
      };
    } catch (error) {
      logger.error("Failed to get chapter", error);
      throw error;
    }
  }

  async getAllChapters(projectId: string) {
    try {
      const store = db.getClient();
      const chapters = await store
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

      // NOTE: 빈 IN 절을 만들지 않기 위한 조기 반환. 챕터가 없으면 body 조회도 불필요하다.
      if (chapters.length === 0) {
        return [];
      }

      // NOTE: 과거에는 챕터마다 readChapterContent를 호출해 목록 조회가 N+1 쿼리였다
      // (chapterBody 조회 N회 + legacy fallback 최대 N회). 200챕터 프로젝트를 열 때마다
      // 최대 401회 왕복이 나갔다. body를 한 번에 읽고 Map으로 합쳐 왕복을 2회로 고정한다.
      // 해석 규칙은 readChapterContent와 동일하게 유지한다:
      //   chapterBody.content(문자열, 빈 문자열 포함) → chapter.content → "".
      const bodyRows = await store
        .select({
          chapterId: chapterBody.chapterId,
          content: chapterBody.content,
        })
        .from(chapterBody)
        .where(
          inArray(
            chapterBody.chapterId,
            chapters.map((item) => String(item.id)),
          ),
        );

      const bodyByChapterId = new Map<string, string>();
      for (const row of bodyRows) {
        // NOTE: 스키마상 notNull이지만 마이그레이션 이전 행을 대비해 readChapterContent와
        // 같은 런타임 가드를 둔다. 문자열이 아니면 legacy 컬럼으로 폴백한다.
        if (typeof row.content !== "string") continue;
        bodyByChapterId.set(row.chapterId, row.content);
      }

      return chapters.map((item) => {
        const body = bodyByChapterId.get(String(item.id));
        return {
          ...item,
          content: body ?? String(item.content ?? ""),
        };
      });
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
    return await updateChapterRecord({
      data: input,
      runInWriteSerialQueue: (task) => this.runInWriteSerialQueue(task),
    });
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
        await autoSaveManager.forgetChapter(String(chapterData.projectId), id);
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
        await projectService.persistPackageAfterMutation(
          String(chapterData.projectId),
          "chapter:delete",
        );
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
      return await db
        .getClient()
        .select()
        .from(chapter)
        .where(
          and(
            eq(chapter.projectId, projectId),
            sql`${chapter.deletedAt} IS NOT NULL`,
          ),
        )
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

      const restoredContent = await readChapterContent(id);
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
      await projectService.persistPackageAfterMutation(
        String(current.projectId),
        "chapter:restore",
      );
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

      await store.delete(chapter).where(eq(chapter.id, id));

      const [appearanceCacheService, chapterSearchCacheService] =
        await Promise.all([
          loadAppearanceCacheService(),
          loadChapterSearchCacheService(),
        ]);
      await appearanceCacheService.clearChapter(id);
      await chapterSearchCacheService.clearChapter(id);

      if (chapterData?.projectId) {
        const autoSaveManager = await loadAutoSaveManager();
        await autoSaveManager.forgetChapter(String(chapterData.projectId), id);
      }

      logger.info("Chapter purged successfully", { chapterId: id });
      if (chapterData?.projectId) {
        await projectService.persistPackageAfterMutation(
          String(chapterData.projectId),
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
      const store = db.getClient();
      store.transaction((tx) => {
        const now = new Date().toISOString();
        for (let index = 0; index < chapterIds.length; index++) {
          const id = chapterIds[index];
          tx.update(chapter)
            .set({ order: index + 1, updatedAt: now })
            .where(eq(chapter.id, id))
            .run();
        }
      });

      logger.info("Chapters reordered successfully", { projectId });
      const chapterSearchCacheService = await loadChapterSearchCacheService();
      await chapterSearchCacheService.rebuildProject(projectId);
      await projectService.persistPackageAfterMutation(
        projectId,
        "chapter:reorder",
      );
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
