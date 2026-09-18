import {
  and,
  asc,
  count,
  desc,
  eq,
  isNull,
  isNotNull,
  like,
  sql,
} from "drizzle-orm";
import type BetterSqliteDatabase from "better-sqlite3";
import { db } from "../../../infra/database/index.js";
import { cacheDb } from "../../../infra/database/cache.js";
import { chapterSearchDocument } from "../../../infra/database/cache.js";
import { chapter, chapterBody } from "../../../infra/database/index.js";
import { createLogger } from "../../../../shared/logger/index.js";
import {
  clearProjectFts,
  countProjectFtsRows,
  isFtsUnavailableError,
  mapChapterSearchDocumentRow,
  searchProjectChaptersWithFts,
  syncFtsDocument,
  toSafeNumber,
} from "./chapterSearchCacheFts.js";
import type { CachedChapterSearchDocument } from "./chapterSearchCacheFts.js";

const getCacheClient = () => cacheDb.getClient();
const getMainClient = () => db.getClient();

export type { CachedChapterSearchDocument } from "./chapterSearchCacheFts.js";

function buildSearchText(input: {
  title: string;
  synopsis?: string | null;
  content?: string | null;
}): string {
  return [input.title, input.synopsis ?? "", input.content ?? ""]
    .filter((segment) => segment.length > 0)
    .join("\n\n");
}

const logger = createLogger("ChapterSearchCacheService");

class ChapterSearchCacheService {
  private ftsWarningLogged = false;

  private logFtsUnavailable(reason: string, error: unknown): void {
    if (this.ftsWarningLogged) {
      return;
    }
    this.ftsWarningLogged = true;
    logger.warn(reason, { error });
  }

  private async clearFtsByProject(projectId: string): Promise<void> {
    await clearProjectFts(projectId, (reason, error) =>
      this.logFtsUnavailable(reason, error),
    );
  }

  private async countProjectFtsRows(projectId: string): Promise<number | null> {
    return await countProjectFtsRows(projectId, (reason, error) =>
      this.logFtsUnavailable(reason, error),
    );
  }

  private async searchProjectChaptersWithFts(
    projectId: string,
    query: string,
    limit: number,
  ): Promise<CachedChapterSearchDocument[]> {
    return await searchProjectChaptersWithFts(
      projectId,
      query,
      limit,
      (reason, error) => this.logFtsUnavailable(reason, error),
    );
  }

  private async searchProjectChaptersFallback(
    projectId: string,
    query: string,
    limit: number,
  ): Promise<CachedChapterSearchDocument[]> {
    const client = getCacheClient();
    const rows = await client
      .select()
      .from(chapterSearchDocument)
      .where(
        and(
          eq(chapterSearchDocument.projectId, projectId),
          like(chapterSearchDocument.searchText, `%${query}%`),
        ),
      )
      .orderBy(
        asc(chapterSearchDocument.chapterOrder),
        desc(chapterSearchDocument.updatedAt),
      )
      .limit(limit);
    return rows.map(mapChapterSearchDocumentRow);
  }

  async upsertChapter(input: {
    chapterId: string;
    projectId: string;
    title: string;
    synopsis?: string | null;
    content?: string | null;
    wordCount: number;
    order: number;
  }): Promise<CachedChapterSearchDocument> {
    const searchText = buildSearchText(input);
    const client = getCacheClient();
    const writeProjection = () =>
      client
        .insert(chapterSearchDocument)
        .values({
          chapterId: input.chapterId,
          projectId: input.projectId,
          title: input.title,
          synopsis: input.synopsis ?? null,
          searchText,
          wordCount: input.wordCount,
          chapterOrder: input.order,
        })
        .onConflictDoUpdate({
          target: [chapterSearchDocument.chapterId],
          set: {
            projectId: input.projectId,
            title: input.title,
            synopsis: input.synopsis ?? null,
            searchText,
            wordCount: input.wordCount,
            chapterOrder: input.order,
          },
        })
        .returning()
        .get();
    let row: typeof chapterSearchDocument.$inferSelect;
    try {
      row = cacheDb.runSqliteTransaction((sqlite) => {
        const document = writeProjection();
        syncFtsDocument(sqlite, {
          chapterId: input.chapterId,
          projectId: input.projectId,
          title: input.title,
          synopsis: input.synopsis ?? null,
          searchText,
          ftsRowId: document.ftsRowId,
        });
        return document;
      });
    } catch (error) {
      if (!isFtsUnavailableError(error)) throw error;
      this.logFtsUnavailable(
        "Chapter search FTS sync unavailable; keeping projection fallback",
        error,
      );
      row = cacheDb.runSqliteTransaction(writeProjection);
    }
    const document = mapChapterSearchDocumentRow(row);
    return document;
  }

  async searchProjectChapters(
    projectId: string,
    query: string,
    limit = 5,
  ): Promise<CachedChapterSearchDocument[]> {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 0) {
      return [];
    }

    await this.ensureProjectHydrated(projectId);
    const ftsResults = await this.searchProjectChaptersWithFts(
      projectId,
      normalizedQuery,
      limit,
    );

    if (ftsResults.length > 0) {
      return ftsResults;
    }

    return await this.searchProjectChaptersFallback(
      projectId,
      normalizedQuery,
      limit,
    );
  }

  async getIndexStatus(projectId: string): Promise<{
    projectId: string;
    projectionCount: number;
    ftsCount: number | null;
    pendingQueueCount: number;
  }> {
    const cacheClient = getCacheClient();
    const projectionRows = await cacheClient
      .select({ count: count() })
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.projectId, projectId));
    const projectionCount = toSafeNumber(projectionRows[0]?.count);
    const ftsCount = await this.countProjectFtsRows(projectId);
    const mainClient = getMainClient();
    const queueRows = await mainClient.all<{ count: unknown }>(
      sql`SELECT COUNT(*) as count FROM "SearchDirtyQueue" WHERE "projectId" = ${projectId} AND "status" = 'pending';`,
    );
    return {
      projectId,
      projectionCount,
      ftsCount,
      pendingQueueCount: toSafeNumber(queueRows[0]?.count),
    };
  }

  async rebuildProjectIndex(projectId: string): Promise<{ success: boolean }> {
    await this.rebuildProject(projectId);
    return { success: true };
  }

  async refreshChapter(chapterId: string): Promise<void> {
    const rows = await getMainClient()
      .select({
        id: chapter.id,
        projectId: chapter.projectId,
        title: chapter.title,
        synopsis: chapter.synopsis,
        content: chapter.content,
        bodyContent: chapterBody.content,
        wordCount: chapter.wordCount,
        order: chapter.order,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(and(eq(chapter.id, chapterId), isNull(chapter.deletedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      await this.clearChapter(chapterId);
      return;
    }

    await this.upsertChapter({
      chapterId: row.id,
      projectId: row.projectId,
      title: row.title,
      synopsis: row.synopsis,
      content: row.bodyContent ?? row.content,
      wordCount: row.wordCount,
      order: row.order,
    });
  }

  async clearChapter(chapterId: string): Promise<void> {
    const clearProjection = (sqlite: BetterSqliteDatabase.Database) =>
      sqlite
        .prepare(`DELETE FROM "ChapterSearchDocument" WHERE "chapterId" = ?`)
        .run(chapterId);
    try {
      cacheDb.runSqliteTransaction((sqlite) => {
        const row = sqlite
          .prepare(
            `SELECT "ftsRowId" FROM "ChapterSearchDocument" WHERE "chapterId" = ?`,
          )
          .get(chapterId) as { ftsRowId: number | null } | undefined;
        clearProjection(sqlite);
        if (row?.ftsRowId === null || row?.ftsRowId === undefined) {
          sqlite
            .prepare(
              `DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?`,
            )
            .run(chapterId);
        } else {
          sqlite
            .prepare(`DELETE FROM "ChapterSearchDocumentFts" WHERE rowid = ?`)
            .run(row.ftsRowId);
        }
      });
    } catch (error) {
      if (!isFtsUnavailableError(error)) throw error;
      this.logFtsUnavailable(
        "Chapter search FTS clear unavailable; keeping projection fallback",
        error,
      );
      cacheDb.runSqliteTransaction(clearProjection);
    }
  }

  async clearProject(projectId: string): Promise<void> {
    const client = getCacheClient();
    await Promise.all([
      client
        .delete(chapterSearchDocument)
        .where(eq(chapterSearchDocument.projectId, projectId)),
      this.clearFtsByProject(projectId),
    ]);
  }

  async getProjectFtsRowCount(projectId: string): Promise<number | null> {
    return await this.countProjectFtsRows(projectId);
  }

  async ensureProjectHydrated(projectId: string): Promise<void> {
    const cacheClient = getCacheClient();
    const mainClient = getMainClient();
    const [cacheCountResult, mappedCountResult, chapterCountResult, ftsCount] =
      await Promise.all([
        cacheClient
          .select({ count: count() })
          .from(chapterSearchDocument)
          .where(eq(chapterSearchDocument.projectId, projectId)),
        cacheClient
          .select({ count: count() })
          .from(chapterSearchDocument)
          .where(
            and(
              eq(chapterSearchDocument.projectId, projectId),
              isNotNull(chapterSearchDocument.ftsRowId),
            ),
          ),
        mainClient
          .select({ count: count() })
          .from(chapter)
          .where(
            and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)),
          ),
        this.countProjectFtsRows(projectId),
      ]);
    const cacheCount = cacheCountResult[0]?.count ?? 0;
    const mappedCount = mappedCountResult[0]?.count ?? 0;
    const chapterCount = chapterCountResult[0]?.count ?? 0;

    if (chapterCount === 0) {
      if (cacheCount > 0) {
        await this.clearProject(projectId);
      }
      return;
    }

    const ftsMatchesProjection =
      ftsCount === null ||
      (ftsCount === cacheCount && mappedCount === cacheCount);
    if (cacheCount === chapterCount && ftsMatchesProjection) {
      return;
    }

    await this.rebuildProject(projectId);
  }

  async rebuildProject(projectId: string): Promise<void> {
    const mainClient = getMainClient();
    const chapters = await mainClient
      .select({
        id: chapter.id,
        title: chapter.title,
        synopsis: chapter.synopsis,
        content: chapter.content,
        bodyContent: chapterBody.content,
        wordCount: chapter.wordCount,
        order: chapter.order,
      })
      .from(chapter)
      .leftJoin(chapterBody, eq(chapterBody.chapterId, chapter.id))
      .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt)))
      .orderBy(asc(chapter.order));

    const documents = chapters.map((row) => ({
      chapterId: row.id,
      projectId,
      title: row.title,
      synopsis: row.synopsis ?? "",
      searchText: buildSearchText({
        title: row.title,
        synopsis: row.synopsis,
        content: row.bodyContent ?? row.content,
      }),
      wordCount: row.wordCount,
      chapterOrder: row.order,
    }));

    const replaceRows = (includeFts: boolean) => {
      cacheDb.runSqliteTransaction((sqlite) => {
        sqlite
          .prepare(`DELETE FROM "ChapterSearchDocument" WHERE "projectId" = ?`)
          .run(projectId);
        if (includeFts) {
          sqlite
            .prepare(
              `DELETE FROM "ChapterSearchDocumentFts" WHERE "projectId" = ?`,
            )
            .run(projectId);
        }

        const insertProjection = sqlite.prepare(
          `INSERT INTO "ChapterSearchDocument" ("chapterId", "projectId", "title", "synopsis", "searchText", "wordCount", "chapterOrder", "ftsRowId", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        const insertFts = includeFts
          ? sqlite.prepare(
              `INSERT INTO "ChapterSearchDocumentFts" ("chapterId", "projectId", "title", "synopsis", "searchText") VALUES (?, ?, ?, ?, ?)`,
            )
          : null;
        const now = new Date().toISOString();
        for (const document of documents) {
          const ftsResult = insertFts?.run(
            document.chapterId,
            document.projectId,
            document.title,
            document.synopsis,
            document.searchText,
          );
          insertProjection.run(
            document.chapterId,
            document.projectId,
            document.title,
            document.synopsis,
            document.searchText,
            document.wordCount,
            document.chapterOrder,
            ftsResult ? Number(ftsResult.lastInsertRowid) : null,
            now,
            now,
          );
        }
      });
    };

    try {
      replaceRows(true);
    } catch (error) {
      if (!isFtsUnavailableError(error)) throw error;
      this.logFtsUnavailable(
        "Chapter search FTS rebuild unavailable; keeping projection fallback",
        error,
      );
      await this.clearFtsByProject(projectId);
      replaceRows(false);
    }
  }
}

export const chapterSearchCacheService = new ChapterSearchCacheService();
