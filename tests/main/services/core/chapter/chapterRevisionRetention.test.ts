// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: revision reason 구분, autosave coalescing, chapter별 100개 보관 상한

import crypto from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterBody,
  chapterRevision,
  db,
  project,
} from "../../../../../src/main/database/index.js";
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
});
