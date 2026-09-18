import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  chapter,
  chapterBody,
  db,
  project,
} from "../../../../../src/main/database/index.js";
import { hashChapterContent } from "../../../../../src/main/services/core/chapter/chapterContentStore.js";
import { projectService } from "../../../../../src/main/services/features/project/projectService.js";

const mocked = vi.hoisted(() => ({
  track: vi.fn(async () => undefined),
  pending: [] as Promise<unknown>[],
}));

vi.mock(
  "../../../../../src/main/services/features/manuscript/chapterKeywords.js",
  () => ({ trackKeywordAppearances: mocked.track }),
);
vi.mock(
  "../../../../../src/main/services/core/chapter/chapterRuntime.js",
  () => ({
    chapterLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    ENABLE_STRESS_TRACE: false,
    SKIP_NONCRITICAL_DERIVED_ON_STRESS: false,
    SKIP_DERIVED_ENQUEUE_ON_STRESS: false,
    SUPPRESS_HOT_PATH_INFO_LOGS: true,
    perfNow: () => Date.now(),
    logTrace: vi.fn(),
    fireAndForget: (promise: Promise<unknown>) => {
      mocked.pending.push(promise);
    },
  }),
);

const { updateChapterRecord } = await import(
  "../../../../../src/main/services/core/chapter/chapterWriteOperations.js"
);

const projectId = "db-13-dispatch-project";
const chapterId = "db-13-dispatch-chapter";
const oldContent = "committed old body";
const now = "2026-09-13T00:00:00.000Z";

describe("chapter keyword dispatch commit boundary", () => {
  beforeEach(() => {
    mocked.pending.length = 0;
    mocked.track.mockReset();
    db.getClient()
      .insert(project)
      .values({
        id: projectId,
        title: "DB-13 dispatch",
        projectPath: null,
        updatedAt: now,
      })
      .run();
    db.getClient()
      .insert(chapter)
      .values({
        id: chapterId,
        projectId,
        title: "chapter",
        order: 1,
        content: oldContent,
        wordCount: oldContent.length,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    db.getClient()
      .insert(chapterBody)
      .values({
        chapterId,
        content: oldContent,
        contentHash: hashChapterContent(oldContent),
        updatedAt: now,
      })
      .run();
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue(
      undefined,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches committed content, skips no-op, and does not dispatch a rolled-back save", async () => {
    const observedBodies: string[] = [];
    mocked.track.mockImplementation(async () => {
      const [body] = await db
        .getClient()
        .select({ content: chapterBody.content })
        .from(chapterBody)
        .where(eq(chapterBody.chapterId, chapterId));
      observedBodies.push(body?.content ?? "missing");
    });

    await updateChapterRecord({
      data: { id: chapterId, content: "committed new body" },
      runInWriteSerialQueue: async (task) => task(),
    });
    await Promise.all(mocked.pending);
    expect(observedBodies).toEqual(["committed new body"]);

    mocked.pending.length = 0;
    mocked.track.mockClear();
    await updateChapterRecord({
      data: { id: chapterId, content: "committed new body" },
      runInWriteSerialQueue: async (task) => task(),
    });
    expect(mocked.track).not.toHaveBeenCalled();

    db.getClient().run(sql.raw(`
      CREATE TEMP TRIGGER "db13_fail_revision"
      BEFORE INSERT ON "ChapterRevision"
      BEGIN
        SELECT RAISE(ABORT, 'forced revision failure');
      END;
    `));
    try {
      await expect(
        updateChapterRecord({
          data: { id: chapterId, content: "must roll back" },
          runInWriteSerialQueue: async (task) => task(),
        }),
      ).rejects.toThrow();
    } finally {
      db.getClient().run(sql.raw('DROP TRIGGER IF EXISTS "db13_fail_revision";'));
    }
    expect(mocked.track).not.toHaveBeenCalled();
    const [body] = await db
      .getClient()
      .select()
      .from(chapterBody)
      .where(eq(chapterBody.chapterId, chapterId));
    expect(body?.content).toBe("committed new body");
  });
});
