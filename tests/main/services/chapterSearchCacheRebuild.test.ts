// TEST_LEVEL: REAL_DB_CACHE_DB_INTEGRATION
// PROVES: full FTS rebuild가 단일 transaction/prepared statements를 사용하고 단건 FTS 갱신이 rowid를 사용한다.

import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  CACHE_PACKAGED_SCHEMA_FTS_BOOTSTRAP_SQL,
  cacheDb,
  chapterSearchDocument,
} from "../../../src/main/database/cache/index.js";
import {
  chapter,
  chapterBody,
  db,
  project,
} from "../../../src/main/database/index.js";
import { chapterSearchCacheService } from "../../../src/main/services/features/search/chapterSearchCacheService.js";

const insertProjectWithChapters = async (chapterCount: number) => {
  const projectId = crypto.randomUUID();
  const now = "2026-09-13T00:00:00.000Z";
  const chapterIds = Array.from({ length: chapterCount }, () =>
    crypto.randomUUID(),
  );
  await db.getClient().insert(project).values({
    id: projectId,
    title: "FTS rebuild project",
    createdAt: now,
    updatedAt: now,
  });
  if (chapterIds.length > 0) {
    await db
      .getClient()
      .insert(chapter)
      .values(
        chapterIds.map((id, order) => ({
          id,
          projectId,
          title: `Chapter ${order}`,
          content: `legacy body ${order}`,
          wordCount: 3,
          order,
          createdAt: now,
          updatedAt: now,
        })),
      );
    await db
      .getClient()
      .insert(chapterBody)
      .values(
        chapterIds.map((chapterId, order) => ({
          chapterId,
          content: `canonical body ${order}`,
          contentHash: `hash-${order}`,
          updatedAt: now,
        })),
      );
  }
  return { projectId, chapterIds };
};

const readMappedFtsCount = (projectId: string): number =>
  cacheDb.runSqliteTransaction((sqlite) => {
    const row = sqlite
      .prepare(
        `SELECT COUNT(*) AS "count"
         FROM "ChapterSearchDocument" p
         JOIN "ChapterSearchDocumentFts" f
           ON f.rowid = p."ftsRowId" AND f."chapterId" = p."chapterId"
         WHERE p."projectId" = ?`,
      )
      .get(projectId) as { count: number };
    return Number(row.count);
  });

describe("chapter search cache rebuild", () => {
  it("keeps the projection fallback when FTS5 is unavailable", async () => {
    const target = await insertProjectWithChapters(1);
    const chapterId = target.chapterIds[0] as string;
    let searchResults: Awaited<
      ReturnType<typeof chapterSearchCacheService.searchProjectChapters>
    >;
    cacheDb.runSqliteTransaction((sqlite) => {
      sqlite.exec(`DROP TABLE "ChapterSearchDocumentFts"`);
    });
    try {
      await chapterSearchCacheService.upsertChapter({
        chapterId,
        projectId: target.projectId,
        title: "Projection fallback",
        content: "fallback body",
        wordCount: 2,
        order: 0,
      });
      searchResults = await chapterSearchCacheService.searchProjectChapters(
        target.projectId,
        "fallback body",
      );
    } finally {
      cacheDb.runSqliteTransaction((sqlite) => {
        sqlite.exec(CACHE_PACKAGED_SCHEMA_FTS_BOOTSTRAP_SQL);
      });
    }

    const [projection] = await cacheDb
      .getClient()
      .select()
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.chapterId, chapterId));
    expect(projection?.searchText).toContain("fallback body");
    expect(searchResults.map((row) => row.chapterId)).toEqual([chapterId]);
  });

  it("keeps one mapped FTS row when two upserts for the same chapter start together", async () => {
    const target = await insertProjectWithChapters(1);
    const unrelated = await insertProjectWithChapters(1);
    await chapterSearchCacheService.rebuildProject(target.projectId);
    await chapterSearchCacheService.rebuildProject(unrelated.projectId);
    const chapterId = target.chapterIds[0] as string;

    await Promise.all([
      chapterSearchCacheService.upsertChapter({
        chapterId,
        projectId: target.projectId,
        title: "Concurrent alpha",
        content: "alpha body",
        wordCount: 2,
        order: 0,
      }),
      chapterSearchCacheService.upsertChapter({
        chapterId,
        projectId: target.projectId,
        title: "Concurrent beta",
        content: "beta body",
        wordCount: 2,
        order: 0,
      }),
    ]);

    const state = cacheDb.runSqliteTransaction((sqlite) => {
      const projection = sqlite
        .prepare(
          `SELECT "ftsRowId", "searchText" FROM "ChapterSearchDocument" WHERE "chapterId" = ?`,
        )
        .get(chapterId) as { ftsRowId: number; searchText: string };
      const ftsRows = sqlite
        .prepare(
          `SELECT rowid, "searchText" FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ? ORDER BY rowid`,
        )
        .all(chapterId) as Array<{ rowid: number; searchText: string }>;
      return { projection, ftsRows };
    });

    expect(state.ftsRows).toHaveLength(1);
    expect(state.ftsRows[0]).toEqual({
      rowid: state.projection.ftsRowId,
      searchText: state.projection.searchText,
    });
    expect(state.projection.searchText).toMatch(/Concurrent (alpha|beta)/);
    expect(readMappedFtsCount(target.projectId)).toBe(1);
    expect(readMappedFtsCount(unrelated.projectId)).toBe(1);
  });

  it("rolls back a single projection and FTS replacement when mapping fails", async () => {
    const target = await insertProjectWithChapters(1);
    await chapterSearchCacheService.rebuildProject(target.projectId);
    const chapterId = target.chapterIds[0] as string;
    const before = cacheDb.runSqliteTransaction((sqlite) => ({
      projection: sqlite
        .prepare(
          `SELECT * FROM "ChapterSearchDocument" WHERE "chapterId" = ?`,
        )
        .get(chapterId),
      fts: sqlite
        .prepare(
          `SELECT rowid, * FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?`,
        )
        .all(chapterId),
    }));

    cacheDb.runSqliteTransaction((sqlite) => {
      sqlite.exec(`CREATE TEMP TRIGGER "fail_single_fts_mapping"
        BEFORE UPDATE OF "ftsRowId" ON "ChapterSearchDocument"
        WHEN NEW."chapterId" = '${chapterId}'
        BEGIN
          SELECT RAISE(ABORT, 'forced single mapping failure');
        END;`);
    });
    try {
      await expect(
        chapterSearchCacheService.upsertChapter({
          chapterId,
          projectId: target.projectId,
          title: "Rejected update",
          content: "must roll back",
          wordCount: 3,
          order: 0,
        }),
      ).rejects.toThrow("forced single mapping failure");
    } finally {
      cacheDb.runSqliteTransaction((sqlite) => {
        sqlite.exec(`DROP TRIGGER IF EXISTS "fail_single_fts_mapping"`);
      });
    }

    const after = cacheDb.runSqliteTransaction((sqlite) => ({
      projection: sqlite
        .prepare(
          `SELECT * FROM "ChapterSearchDocument" WHERE "chapterId" = ?`,
        )
        .get(chapterId),
      fts: sqlite
        .prepare(
          `SELECT rowid, * FROM "ChapterSearchDocumentFts" WHERE "chapterId" = ?`,
        )
        .all(chapterId),
    }));
    expect(after).toEqual(before);
  });

  it("rebuilds 300 chapters with mapped FTS rowids and preserves unrelated rows", async () => {
    const unrelated = await insertProjectWithChapters(1);
    const target = await insertProjectWithChapters(300);
    await chapterSearchCacheService.rebuildProject(unrelated.projectId);
    await chapterSearchCacheService.rebuildProject(target.projectId);

    expect(readMappedFtsCount(target.projectId)).toBe(300);
    expect(readMappedFtsCount(unrelated.projectId)).toBe(1);

    const targetChapterId = target.chapterIds[0] as string;
    const untouchedChapterId = target.chapterIds[1] as string;
    const untouchedBefore = cacheDb.runSqliteTransaction((sqlite) =>
      sqlite
        .prepare(
          `SELECT f.rowid, f."searchText"
           FROM "ChapterSearchDocument" p
           JOIN "ChapterSearchDocumentFts" f ON f.rowid = p."ftsRowId"
           WHERE p."chapterId" = ?`,
        )
        .get(untouchedChapterId),
    );
    await db
      .getClient()
      .update(chapterBody)
      .set({ content: "latest single chapter body" })
      .where(eq(chapterBody.chapterId, targetChapterId));

    await chapterSearchCacheService.refreshChapter(targetChapterId);

    const [updatedProjection] = await cacheDb
      .getClient()
      .select()
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.chapterId, targetChapterId));
    const updatedFts = cacheDb.runSqliteTransaction((sqlite) =>
      sqlite
        .prepare(
          `SELECT "chapterId", "searchText" FROM "ChapterSearchDocumentFts" WHERE rowid = ?`,
        )
        .get(updatedProjection?.ftsRowId),
    ) as { chapterId: string; searchText: string };
    const untouchedAfter = cacheDb.runSqliteTransaction((sqlite) =>
      sqlite
        .prepare(
          `SELECT f.rowid, f."searchText"
           FROM "ChapterSearchDocument" p
           JOIN "ChapterSearchDocumentFts" f ON f.rowid = p."ftsRowId"
           WHERE p."chapterId" = ?`,
        )
        .get(untouchedChapterId),
    );
    const plan = cacheDb.runSqliteTransaction((sqlite) =>
      sqlite
        .prepare(
          `EXPLAIN QUERY PLAN DELETE FROM "ChapterSearchDocumentFts" WHERE rowid = ?`,
        )
        .all(updatedProjection?.ftsRowId),
    ) as Array<{ detail: string }>;

    expect(updatedProjection?.searchText).toContain(
      "latest single chapter body",
    );
    expect(updatedFts).toMatchObject({
      chapterId: targetChapterId,
      searchText: expect.stringContaining("latest single chapter body"),
    });
    expect(untouchedAfter).toEqual(untouchedBefore);
    expect(plan.map((row) => row.detail).join(" ")).toContain("INDEX 0:=");
  });

  it("rolls back the whole project rebuild when a prepared projection insert fails", async () => {
    const target = await insertProjectWithChapters(3);
    await chapterSearchCacheService.rebuildProject(target.projectId);
    const sentinelChapterId = target.chapterIds[0] as string;
    const failingChapterId = target.chapterIds[2] as string;
    await cacheDb
      .getClient()
      .update(chapterSearchDocument)
      .set({ searchText: "rollback sentinel" })
      .where(eq(chapterSearchDocument.chapterId, sentinelChapterId));

    cacheDb.runSqliteTransaction((sqlite) => {
      sqlite.exec(`CREATE TRIGGER "fail_search_rebuild"
        BEFORE INSERT ON "ChapterSearchDocument"
        WHEN NEW."chapterId" = '${failingChapterId}'
        BEGIN
          SELECT RAISE(ABORT, 'forced rebuild failure');
        END;`);
    });
    try {
      await expect(
        chapterSearchCacheService.rebuildProject(target.projectId),
      ).rejects.toThrow("forced rebuild failure");
    } finally {
      cacheDb.runSqliteTransaction((sqlite) => {
        sqlite.exec(`DROP TRIGGER IF EXISTS "fail_search_rebuild"`);
      });
    }

    const [sentinel] = await cacheDb
      .getClient()
      .select()
      .from(chapterSearchDocument)
      .where(eq(chapterSearchDocument.chapterId, sentinelChapterId));
    const countRows = await cacheDb
      .getClient()
      .all<{ count: number }>(
        sql`SELECT COUNT(*) AS "count" FROM "ChapterSearchDocument" WHERE "projectId" = ${target.projectId}`,
      );
    expect(sentinel?.searchText).toBe("rollback sentinel");
    expect(Number(countRows[0]?.count)).toBe(3);
    expect(readMappedFtsCount(target.projectId)).toBe(3);
  });
});
