import { eq, and, isNull, desc, asc, sql } from "drizzle-orm";
import { db } from "../../../infra/database/index.js";
import * as schema from "../../../infra/database/index.js";
import { ErrorCode } from "../../../../shared/constants/index.js";
import type {
  ChapterCreateInput,
  ChapterListItem,
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

const { chapter } = schema;

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

  /**
   * 프로젝트의 챕터 목록을 조회한다. 본문(`content`)은 포함하지 않는다.
   *
   * NOTE: 목록 UI는 제목/순서만 그리는데 본문까지 실어 보내면 프로젝트의 모든 본문이
   * IPC 직렬화를 거쳐 렌더러 힙에 상주한다. 본문이 필요한 화면은 `getChapter`(단건)로
   * 받는다. 이 경계 덕분에 body 테이블을 조회할 이유가 없어 왕복은 select 1회다.
   *
   * WARNING: 반환 타입에 `content`를 되살리면 위 경계가 무너진다. 목록 응답에 본문이
   * 필요해 보이면 호출부가 단건 조회를 쓰도록 고쳐야 한다.
   */
  async getAllChapters(projectId: string): Promise<ChapterListItem[]> {
    try {
      const store = db.getClient();
      return await store
        .select({
          id: chapter.id,
          projectId: chapter.projectId,
          title: chapter.title,
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

  /**
   * 휴지통(soft delete) 챕터 목록. 본문(`content`)은 포함하지 않는다.
   *
   * NOTE: `getAllChapters`와 같은 경계다. 이전에는 `.select()`로 전 컬럼을 가져와 legacy
   * `chapter.content`까지 실어 보냈다. 휴지통 UI는 제목/삭제시각만 그리고(`TrashList`는
   * content를 참조하지 않는다) 복원은 `restoreChapter`가 따로 처리하므로 본문이 필요 없다.
   * 마이그레이션 이전 프로젝트는 legacy 컬럼에 본문이 남아 있어 그대로 두면 삭제 챕터 수만큼
   * 본문이 렌더러 힙에 올라온다.
   */
  async getDeletedChapters(projectId: string): Promise<ChapterListItem[]> {
    try {
      return await db
        .getClient()
        .select({
          id: chapter.id,
          projectId: chapter.projectId,
          title: chapter.title,
          synopsis: chapter.synopsis,
          order: chapter.order,
          wordCount: chapter.wordCount,
          createdAt: chapter.createdAt,
          updatedAt: chapter.updatedAt,
          deletedAt: chapter.deletedAt,
        })
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
