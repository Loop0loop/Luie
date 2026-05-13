import { and, asc, count, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { db } from "../../database/index.js";
import { cacheDb } from "../../database/cacheDb.js";
import { chapterSearchDocument } from "../../database/cacheSchema.js";
import { chapter, chapterBody } from "../../database/schema.js";
import { createLogger } from "../../../shared/logger/index.js";

const getCacheClient = () => cacheDb.getClient();
const getMainClient = () => db.getClient();

export type CachedChapterSearchDocument = {
  chapterId: string;
  projectId: string;
  title: string;
  synopsis: string | null;
  searchText: string;
  wordCount: number;
  chapterOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

function mapChapterSearchDocumentRow(
  row: typeof chapterSearchDocument.$inferSelect,
): CachedChapterSearchDocument {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function buildSearchText(input: {
  title: string;
  synopsis?: string | null;
  content?: string | null;
}): string {
  return [input.title, input.synopsis ?? "", input.content ?? ""]
    .filter((segment) => segment.length > 0)
    .join("\n\n");
}

function buildFtsQuery(query: string): string {
  return `"${query.replaceAll('"', '""').trim()}"`;
}

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
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

  private async syncFtsDocument(input: {
    chapterId: string;
    projectId: string;
    title: string;
    synopsis?: string | null;
    searchText: string;
  }): Promise<void> {
    try {
      const client = getCacheClient();
      client.run(sql`DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ${input.chapterId};`);
      client.run(sql`INSERT INTO "ChapterSearchDocumentFts" ("chapterId", "projectId", "title", "synopsis", "searchText") VALUES (${input.chapterId}, ${input.projectId}, ${input.title}, ${input.synopsis ?? ""}, ${input.searchText});`);
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS sync unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async clearFtsByChapter(chapterId: string): Promise<void> {
    try {
      const client = getCacheClient();
      client.run(sql`DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ${chapterId};`);
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS clear unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async clearFtsByProject(projectId: string): Promise<void> {
    try {
      const client = getCacheClient();
      client.run(sql`DELETE FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId};`);
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS project clear unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async countProjectFtsRows(projectId: string): Promise<number | null> {
    try {
      const client = getCacheClient();
      const rows = client.all<{ count: unknown }>(sql`SELECT COUNT(*) as count FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId};`);
      return toSafeNumber(rows[0]?.count);
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS count unavailable; keeping projection fallback",
        error,
      );
      return null;
    }
  }

  private async searchProjectChaptersWithFts(
    projectId: string,
    query: string,
    limit: number,
  ): Promise<CachedChapterSearchDocument[]> {
    try {
      const client = getCacheClient();
      const ftsQuery = buildFtsQuery(query);
      const rows = client.all<{ chapterId: string }>(sql`SELECT "chapterId" FROM "ChapterSearchDocumentFts" WHERE "projectId" = ${projectId} AND "ChapterSearchDocumentFts" MATCH ${ftsQuery} ORDER BY bm25("ChapterSearchDocumentFts"), "chapterId" LIMIT ${limit};`);

      if (rows.length === 0) {
        return [];
      }

      const chapterIds = rows.map((row) => row.chapterId);
      const documents = await client
        .select()
        .from(chapterSearchDocument)
        .where(inArray(chapterSearchDocument.chapterId, chapterIds));
      const documentMap = new Map(
        documents.map((doc) => [doc.chapterId, mapChapterSearchDocumentRow(doc)]),
      );

      return chapterIds
        .map((cid) => documentMap.get(cid))
        .filter((doc): doc is CachedChapterSearchDocument => Boolean(doc));
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS query unavailable; falling back to projection search",
        error,
      );
      return [];
    }
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
      .orderBy(asc(chapterSearchDocument.chapterOrder), desc(chapterSearchDocument.updatedAt))
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
    const [row] = await client
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
      .returning();
    const document = mapChapterSearchDocumentRow(row);
    await this.syncFtsDocument({
      chapterId: input.chapterId,
      projectId: input.projectId,
      title: input.title,
      synopsis: input.synopsis ?? null,
      searchText,
    });
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

  async clearChapter(chapterId: string): Promise<void> {
    const client = getCacheClient();
    await Promise.all([
      client.delete(chapterSearchDocument).where(eq(chapterSearchDocument.chapterId, chapterId)),
      this.clearFtsByChapter(chapterId),
    ]);
  }

  async clearProject(projectId: string): Promise<void> {
    const client = getCacheClient();
    await Promise.all([
      client.delete(chapterSearchDocument).where(eq(chapterSearchDocument.projectId, projectId)),
      this.clearFtsByProject(projectId),
    ]);
  }

  async getProjectFtsRowCount(projectId: string): Promise<number | null> {
    return await this.countProjectFtsRows(projectId);
  }

  async ensureProjectHydrated(projectId: string): Promise<void> {
    const cacheClient = getCacheClient();
    const mainClient = getMainClient();
    const [cacheCountResult, chapterCountResult, ftsCount] = await Promise.all([
      cacheClient
        .select({ count: count() })
        .from(chapterSearchDocument)
        .where(eq(chapterSearchDocument.projectId, projectId)),
      mainClient
        .select({ count: count() })
        .from(chapter)
        .where(and(eq(chapter.projectId, projectId), isNull(chapter.deletedAt))),
      this.countProjectFtsRows(projectId),
    ]);
    const cacheCount = cacheCountResult[0]?.count ?? 0;
    const chapterCount = chapterCountResult[0]?.count ?? 0;

    if (chapterCount === 0) {
      if (cacheCount > 0) {
        await this.clearProject(projectId);
      }
      return;
    }

    const ftsMatchesProjection = ftsCount === null || ftsCount === cacheCount;
    if (cacheCount === chapterCount && ftsMatchesProjection) {
      return;
    }

    await this.rebuildProject(projectId);
  }

  async rebuildProject(projectId: string): Promise<void> {
    const cacheClient = getCacheClient();
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

    await this.clearProject(projectId);

    if (chapters.length === 0) {
      return;
    }

    await cacheClient.insert(chapterSearchDocument).values(
      chapters.map((ch) => ({
        chapterId: ch.id,
        projectId,
        title: ch.title,
        synopsis: ch.synopsis,
        searchText: buildSearchText({
          title: ch.title,
          synopsis: ch.synopsis,
          content: ch.bodyContent ?? ch.content,
        }),
        wordCount: ch.wordCount,
        chapterOrder: ch.order,
      })),
    );
    await Promise.all(
      chapters.map(async (ch) => {
        await this.syncFtsDocument({
          chapterId: ch.id,
          projectId,
          title: ch.title,
          synopsis: ch.synopsis,
          searchText: buildSearchText({
            title: ch.title,
            synopsis: ch.synopsis,
            content: ch.bodyContent ?? ch.content,
          }),
        });
      }),
    );
  }
}

export const chapterSearchCacheService = new ChapterSearchCacheService();
