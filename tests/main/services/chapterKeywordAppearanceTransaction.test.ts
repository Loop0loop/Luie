import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { cacheDb } from "../../../src/main/database/cache/index.js";
import { characterAppearance } from "../../../src/main/database/cache/cacheSchema.js";
import { character, db } from "../../../src/main/database/index.js";
import { ChapterService } from "../../../src/main/services/features/manuscript/chapterService.js";
import { trackKeywordAppearances } from "../../../src/main/services/features/manuscript/chapterKeywords.js";
import { ProjectService } from "../../../src/main/services/features/project/projectService.js";
import { projectService } from "../../../src/main/services/features/project/projectService.js";
import { appearanceCacheService } from "../../../src/main/services/features/world/cache/appearanceCacheService.js";

describe("chapter keyword appearance set transaction", () => {
  const projects = new ProjectService();
  const chapters = new ChapterService();

  beforeAll(() => {
    vi.spyOn(projectService, "schedulePackageExport").mockImplementation(
      () => {},
    );
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
  });

  it("commits 1,000 appearances as one replace set and rolls the whole set back on insert failure", async () => {
    const project = await projects.createProject({
      title: "DB-13 bulk appearance",
      projectPath: "/tmp/db-13-bulk.luie",
    });
    const chapter = await chapters.createChapter({
      projectId: String(project.id),
      title: "bulk chapter",
    });
    const projectId = String(project.id);
    const chapterId = String(chapter.id);
    const appearances = Array.from({ length: 1_000 }, (_, position) => ({
      projectId,
      characterId: "bulk-character",
      position,
      context: `context-${position}`,
    }));

    await appearanceCacheService.replaceChapterAppearances({
      chapterId,
      characterAppearances: appearances,
      termAppearances: [],
    });
    expect(
      await cacheDb
        .getClient()
        .select()
        .from(characterAppearance)
        .where(eq(characterAppearance.chapterId, chapterId)),
    ).toHaveLength(1_000);

    cacheDb.getClient().run(sql.raw(`
      CREATE TEMP TRIGGER "db13_fail_bulk_appearance"
      BEFORE INSERT ON "CharacterAppearance"
      WHEN NEW."position" = 500
      BEGIN
        SELECT RAISE(ABORT, 'forced appearance failure');
      END;
    `));
    try {
      await expect(
        appearanceCacheService.replaceChapterAppearances({
          chapterId,
          characterAppearances: appearances.map((entry) => ({
            ...entry,
            context: `replacement-${entry.position}`,
          })),
          termAppearances: [],
        }),
      ).rejects.toThrow("forced appearance failure");
    } finally {
      cacheDb
        .getClient()
        .run(sql.raw('DROP TRIGGER IF EXISTS "db13_fail_bulk_appearance";'));
    }

    const preserved = await cacheDb
      .getClient()
      .select()
      .from(characterAppearance)
      .where(eq(characterAppearance.chapterId, chapterId));
    expect(preserved).toHaveLength(1_000);
    expect(preserved.find((row) => row.position === 500)?.context).toBe(
      "context-500",
    );
  });

  it("updates firstAppearance once per unique entity and coalesces package export", async () => {
    const project = await projects.createProject({
      title: "DB-13 first appearance",
      projectPath: "/tmp/db-13-first.luie",
    });
    const projectId = String(project.id);
    const personId = "db-13-first-character";
    await db.getClient().insert(character).values({
      id: personId,
      projectId,
      name: "하린",
      updatedAt: "2026-09-13T00:00:00.000Z",
    });
    const chapter = await chapters.createChapter({
      projectId,
      title: "first chapter",
    });
    vi.mocked(projectService.schedulePackageExport).mockClear();

    await trackKeywordAppearances(
      String(chapter.id),
      "하린 ".repeat(1_000),
      projectId,
    );

    const [updated] = await db
      .getClient()
      .select()
      .from(character)
      .where(eq(character.id, personId));
    const rows = await cacheDb
      .getClient()
      .select()
      .from(characterAppearance)
      .where(eq(characterAppearance.chapterId, String(chapter.id)));
    expect(updated?.firstAppearance).toBe(String(chapter.id));
    expect(rows).toHaveLength(1);
    expect(projectService.schedulePackageExport).toHaveBeenCalledTimes(1);
    expect(projectService.schedulePackageExport).toHaveBeenCalledWith(
      projectId,
      "keyword:update-first-appearance",
    );
  });
});
