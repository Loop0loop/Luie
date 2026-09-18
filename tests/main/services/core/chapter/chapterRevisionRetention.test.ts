// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: revision reason·5분 경계, 33K 이력 상한, retention 실패 rollback

import crypto from "node:crypto";
import { asc, eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterBody,
  chapterRevision,
  db,
  project,
} from "../../../../../src/main/database/index.js";
import { ErrorCode } from "../../../../../src/shared/constants/index.js";
import { ChapterService } from "../../../../../src/main/services/features/manuscript/chapterService.js";
import { projectService } from "../../../../../src/main/services/features/project/projectService.js";

const createChapterFixture = async () => {
  const projectId = crypto.randomUUID();
  const chapterId = crypto.randomUUID();
  const now = "2026-09-13T00:00:00.000Z";
  await db.getClient().insert(project).values({
    id: projectId,
    title: "Revision Policy",
    createdAt: now,
    updatedAt: now,
  });
  await db.getClient().insert(chapter).values({
    id: chapterId,
    projectId,
    title: "Chapter",
    content: "initial",
    order: 0,
    createdAt: now,
    updatedAt: now,
  });
  await db.getClient().insert(chapterBody).values({
    chapterId,
    content: "initial",
    contentHash: "initial-hash",
    updatedAt: now,
  });
  return { projectId, chapterId };
};

describe("chapter revision retention", () => {
  beforeAll(() => {
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
  });

  it("separates manual and autosave reasons while coalescing an autosave burst", async () => {
    const { chapterId } = await createChapterFixture();
    const service = new ChapterService();

    await service.updateChapter({ id: chapterId, content: "manual body" });
    await service.updateChapter(
      { id: chapterId, content: "autosave body 1" },
      { revisionReason: "autosave" },
    );
    await service.updateChapter(
      { id: chapterId, content: "autosave body 2" },
      { revisionReason: "autosave" },
    );

    const rows = await db
      .getClient()
      .select()
      .from(chapterRevision)
      .where(eq(chapterRevision.chapterId, chapterId))
      .orderBy(asc(chapterRevision.createdAt), asc(chapterRevision.id));
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.reason).sort()).toEqual([
      "autosave",
      "manual_save",
    ]);
    expect(rows.find((row) => row.reason === "autosave")?.content).toBe(
      "autosave body 2",
    );
  });

  it("keeps only the newest 100 revisions after a content commit", async () => {
    const { chapterId } = await createChapterFixture();
    const service = new ChapterService();
    const seeded = Array.from({ length: 105 }, (_, index) => ({
      id: crypto.randomUUID(),
      chapterId,
      contentHash: `old-hash-${index}`,
      content: `old body ${index}`,
      reason: index % 2 === 0 ? "autosave" : "manual_save",
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    }));
    await db.getClient().insert(chapterRevision).values(seeded);

    await service.updateChapter({ id: chapterId, content: "newest body" });

    const rows = await db
      .getClient()
      .select()
      .from(chapterRevision)
      .where(eq(chapterRevision.chapterId, chapterId))
      .orderBy(asc(chapterRevision.createdAt));
    expect(rows).toHaveLength(100);
    expect(rows.some((row) => row.content === "newest body")).toBe(true);
    for (const expired of seeded.slice(0, 6)) {
      expect(rows.some((row) => row.id === expired.id)).toBe(false);
    }
  });

  it("commits content and retains 100 rows when 33,000 revisions already exist", async () => {
    const { chapterId } = await createChapterFixture();
    const service = new ChapterService();
    await db.getClient().run(sql`
      WITH RECURSIVE sequence(value) AS (
        VALUES(0)
        UNION ALL
        SELECT value + 1 FROM sequence WHERE value < 32999
      )
      INSERT INTO "ChapterRevision" (
        "id", "chapterId", "contentHash", "content", "reason", "createdAt"
      )
      SELECT
        ${chapterId} || ':' || printf('%05d', value),
        ${chapterId},
        'old-hash-' || value,
        'old body ' || value,
        'manual_save',
        '2026-01-01T00:00:00.000Z'
      FROM sequence;
    `);

    await service.updateChapter({ id: chapterId, content: "latest body" });

    const [body] = await db
      .getClient()
      .select()
      .from(chapterBody)
      .where(eq(chapterBody.chapterId, chapterId));
    const [revisionCount] = await db
      .getClient()
      .select({ count: sql<number>`count(*)` })
      .from(chapterRevision)
      .where(eq(chapterRevision.chapterId, chapterId));
    expect(body.content).toBe("latest body");
    expect(revisionCount.count).toBe(100);
  });

  it("coalesces before five minutes and inserts at the exact boundary", async () => {
    const service = new ChapterService();
    const within = await createChapterFixture();
    const boundary = await createChapterFixture();
    const createdAt = "2026-09-13T00:00:00.000Z";
    await db.getClient().insert(chapterRevision).values(
      [within.chapterId, boundary.chapterId].map((chapterId) => ({
        id: crypto.randomUUID(),
        chapterId,
        contentHash: "autosave-hash",
        content: "autosave body",
        reason: "autosave" as const,
        createdAt,
      })),
    );

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-13T00:04:59.999Z"));
      await service.updateChapter(
        { id: within.chapterId, content: "within body" },
        { revisionReason: "autosave" },
      );
      vi.setSystemTime(new Date("2026-09-13T00:05:00.000Z"));
      await service.updateChapter(
        { id: boundary.chapterId, content: "boundary body" },
        { revisionReason: "autosave" },
      );
    } finally {
      vi.useRealTimers();
    }

    const withinRows = await db
      .getClient()
      .select()
      .from(chapterRevision)
      .where(eq(chapterRevision.chapterId, within.chapterId));
    const boundaryRows = await db
      .getClient()
      .select()
      .from(chapterRevision)
      .where(eq(chapterRevision.chapterId, boundary.chapterId));
    expect(withinRows).toHaveLength(1);
    expect(withinRows[0].content).toBe("within body");
    expect(boundaryRows).toHaveLength(2);
    expect(boundaryRows.some((row) => row.content === "boundary body")).toBe(
      true,
    );
  });

  it("rolls back body and revision when retention deletion fails", async () => {
    const { chapterId } = await createChapterFixture();
    const service = new ChapterService();
    await db.getClient().insert(chapterRevision).values(
      Array.from({ length: 100 }, (_, index) => ({
        id: crypto.randomUUID(),
        chapterId,
        contentHash: `old-hash-${index}`,
        content: `old body ${index}`,
        reason: "manual_save" as const,
        createdAt: "2026-01-01T00:00:00.000Z",
      })),
    );
    await db.getClient().run(sql`
      CREATE TEMP TRIGGER "db09_fail_retention_delete"
      BEFORE DELETE ON "ChapterRevision"
      BEGIN
        SELECT RAISE(ABORT, 'forced retention delete failure');
      END;
    `);

    try {
      await expect(
        service.updateChapter({ id: chapterId, content: "rejected body" }),
      ).rejects.toMatchObject({
        code: ErrorCode.CHAPTER_UPDATE_FAILED,
        cause: { cause: { code: "SQLITE_CONSTRAINT_TRIGGER" } },
      });
    } finally {
      await db
        .getClient()
        .run(sql`DROP TRIGGER IF EXISTS "db09_fail_retention_delete";`);
    }

    const [chapterRow] = await db
      .getClient()
      .select()
      .from(chapter)
      .where(eq(chapter.id, chapterId));
    const [body] = await db
      .getClient()
      .select()
      .from(chapterBody)
      .where(eq(chapterBody.chapterId, chapterId));
    const revisionRows = await db
      .getClient()
      .select()
      .from(chapterRevision)
      .where(eq(chapterRevision.chapterId, chapterId));
    expect(chapterRow.content).toBe("initial");
    expect(body).toMatchObject({
      content: "initial",
      contentHash: "initial-hash",
    });
    expect(revisionRows).toHaveLength(100);
    expect(revisionRows.some((row) => row.content === "rejected body")).toBe(
      false,
    );
  });
});
