import { db } from "../../database/index.js";
import { createLogger } from "../../../shared/logger/index.js";

const loadCacheDb = async () =>
  (await import("../../database/cacheDb.js")).cacheDb;

const getCacheClient = async () => {
  const cacheDb = await loadCacheDb();
  return cacheDb.getClient();
};

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
      const client = await getCacheClient();
      await client.$executeRawUnsafe(
        'DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?;',
        input.chapterId,
      );
      await client.$executeRawUnsafe(
        'INSERT INTO "ChapterSearchDocumentFts" ("chapterId", "projectId", "title", "synopsis", "searchText") VALUES (?, ?, ?, ?, ?);',
        input.chapterId,
        input.projectId,
        input.title,
        input.synopsis ?? "",
        input.searchText,
      );
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS sync unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async clearFtsByChapter(chapterId: string): Promise<void> {
    try {
      const client = await getCacheClient();
      await client.$executeRawUnsafe(
        'DELETE FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?;',
        chapterId,
      );
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS clear unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async clearFtsByProject(projectId: string): Promise<void> {
    try {
      const client = await getCacheClient();
      await client.$executeRawUnsafe(
        'DELETE FROM "ChapterSearchDocumentFts" WHERE "projectId" = ?;',
        projectId,
      );
    } catch (error) {
      this.logFtsUnavailable(
        "Chapter search FTS project clear unavailable; keeping projection fallback",
        error,
      );
    }
  }

  private async countProjectFtsRows(projectId: string): Promise<number | null> {
    try {
      const client = await getCacheClient();
      const rows = await client.$queryRawUnsafe<Array<{ count: unknown }>>(
        'SELECT COUNT(*) as count FROM "ChapterSearchDocumentFts" WHERE "projectId" = ?;',
        projectId,
      );
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
      const client = await getCacheClient();
      const rows = await client.$queryRawUnsafe<Array<{ chapterId: string }>>(
        'SELECT "chapterId" FROM "ChapterSearchDocumentFts" WHERE "projectId" = ? AND "ChapterSearchDocumentFts" MATCH ? ORDER BY bm25("ChapterSearchDocumentFts"), "chapterId" LIMIT ?;',
        projectId,
        buildFtsQuery(query),
        limit,
      );

      if (rows.length === 0) {
        return [];
      }

      const chapterIds = rows.map((row) => row.chapterId);
      const documents = await client.chapterSearchDocument.findMany({
        where: {
          chapterId: {
            in: chapterIds,
          },
        },
      });
      const documentMap = new Map(
        documents.map((document) => [document.chapterId, document]),
      );

      return chapterIds
        .map((chapterId) => documentMap.get(chapterId))
        .filter((document): document is CachedChapterSearchDocument =>
          Boolean(document),
        );
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
    const client = await getCacheClient();
    return await client.chapterSearchDocument.findMany({
      where: {
        projectId,
        searchText: { contains: query },
      },
      orderBy: [{ chapterOrder: "asc" }, { updatedAt: "desc" }],
      take: limit,
    });
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
    const client = await getCacheClient();
    const document = await client.chapterSearchDocument.upsert({
      where: { chapterId: input.chapterId },
      create: {
        chapterId: input.chapterId,
        projectId: input.projectId,
        title: input.title,
        synopsis: input.synopsis ?? null,
        searchText,
        wordCount: input.wordCount,
        chapterOrder: input.order,
      },
      update: {
        projectId: input.projectId,
        title: input.title,
        synopsis: input.synopsis ?? null,
        searchText,
        wordCount: input.wordCount,
        chapterOrder: input.order,
      },
    });
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

  async clearChapter(chapterId: string): Promise<void> {
    const client = await getCacheClient();
    await Promise.all([
      client.chapterSearchDocument.deleteMany({
        where: { chapterId },
      }),
      this.clearFtsByChapter(chapterId),
    ]);
  }

  async clearProject(projectId: string): Promise<void> {
    const client = await getCacheClient();
    await Promise.all([
      client.chapterSearchDocument.deleteMany({
        where: { projectId },
      }),
      this.clearFtsByProject(projectId),
    ]);
  }

  async getProjectFtsRowCount(projectId: string): Promise<number | null> {
    return await this.countProjectFtsRows(projectId);
  }

  async ensureProjectHydrated(projectId: string): Promise<void> {
    const client = await getCacheClient();
    const [cacheCount, chapterCount, ftsCount] = await Promise.all([
      client.chapterSearchDocument.count({
        where: { projectId },
      }),
      db.getClient().chapter.count({
        where: {
          projectId,
          deletedAt: null,
        },
      }),
      this.countProjectFtsRows(projectId),
    ]);

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
    const client = await getCacheClient();
    const chapters = (await db.getClient().chapter.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        synopsis: true,
        content: true,
        wordCount: true,
        order: true,
      },
      orderBy: { order: "asc" },
    })) as Array<{
      id: string;
      title: string;
      synopsis: string | null;
      content: string;
      wordCount: number;
      order: number;
    }>;

    await this.clearProject(projectId);

    if (chapters.length === 0) {
      return;
    }

    await client.chapterSearchDocument.createMany({
      data: chapters.map((chapter) => ({
        chapterId: chapter.id,
        projectId,
        title: chapter.title,
        synopsis: chapter.synopsis,
        searchText: buildSearchText({
          title: chapter.title,
          synopsis: chapter.synopsis,
          content: chapter.content,
        }),
        wordCount: chapter.wordCount,
        chapterOrder: chapter.order,
      })),
    });
    await Promise.all(
      chapters.map(async (chapter) => {
        await this.syncFtsDocument({
          chapterId: chapter.id,
          projectId,
          title: chapter.title,
          synopsis: chapter.synopsis,
          searchText: buildSearchText({
            title: chapter.title,
            synopsis: chapter.synopsis,
            content: chapter.content,
          }),
        });
      }),
    );
  }
}

export const chapterSearchCacheService = new ChapterSearchCacheService();
