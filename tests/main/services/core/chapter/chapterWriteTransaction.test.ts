// TEST_LEVEL: REAL_DB_INTEGRATION
// TEST_DESIGN: ISTQB state-transition and fault-injection testing
// PROVES: chapter create/update DB writes commit or rollback as one synchronous transaction
// TEST_SPEC: docs/quality/database/db-03-chapter-transaction-test-report.md

import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import {
  chapter,
  chapterBody,
  chapterRevision,
  character,
  db,
  memoryBuildJob,
  project,
  searchDirtyQueue,
} from "../../../../../src/main/infra/database/index.js";
import {
  createChapterRecord,
  updateChapterRecord,
} from "../../../../../src/main/services/core/chapter/chapterWriteOperations.js";
import { hashChapterContent } from "../../../../../src/main/services/core/chapter/chapterContentStore.js";
import { projectService } from "../../../../../src/main/services/features/project/projectService.js";
import { ErrorCode } from "../../../../../src/shared/constants/index.js";

const projectId = "db-03-project";
const chapterId = "db-03-chapter";
const now = "2026-09-13T00:00:00.000Z";

const runDirectly = async <T>(task: () => Promise<T>): Promise<T> => task();

const seedProject = (): void => {
  db.getClient()
    .insert(project)
    .values({
      id: projectId,
      title: "DB-03 transaction test",
      description: null,
      projectPath: null,
      updatedAt: now,
    })
    .run();
};

const seedChapter = (): void => {
  const content = "old body";
  db.getClient().transaction((tx) => {
    tx.insert(chapter)
      .values({
        id: chapterId,
        projectId,
        title: "Original title",
        synopsis: null,
        order: 1,
        content,
        wordCount: content.length,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(chapterBody)
      .values({
        chapterId,
        content,
        contentHash: hashChapterContent(content),
        updatedAt: now,
      })
      .run();
  });
};

describe("chapter synchronous write transaction", () => {
  beforeEach(() => {
    vi.spyOn(projectService, "persistPackageAfterMutation").mockResolvedValue();
    seedProject();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-DB-03-A rolls back chapter create when body insertion fails", async () => {
    const store = db.getClient();
    store.run(
      sql.raw(`
      CREATE TEMP TRIGGER "db03_fail_body_insert"
      BEFORE INSERT ON "ChapterBody"
      BEGIN
        SELECT RAISE(ABORT, 'forced body insert failure');
      END;
    `),
    );

    try {
      await expect(
        createChapterRecord({
          data: {
            projectId,
            title: "Must roll back",
            clientMutationId: chapterId,
          },
          runInWriteSerialQueue: runDirectly,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.CHAPTER_CREATE_FAILED });
    } finally {
      store.run(sql.raw(`DROP TRIGGER IF EXISTS "db03_fail_body_insert";`));
    }

    expect(
      store.select().from(chapter).where(eq(chapter.id, chapterId)).all(),
    ).toHaveLength(0);
    expect(store.select().from(chapterBody).all()).toHaveLength(0);
    expect(store.select().from(searchDirtyQueue).all()).toHaveLength(0);
    expect(store.select().from(memoryBuildJob).all()).toHaveLength(0);
  });

  it("TC-DB-03-B rolls back chapter update before a queued domain write runs", async () => {
    const store = db.getClient();
    seedChapter();
    store.run(
      sql.raw(`
      CREATE TEMP TRIGGER "db03_fail_revision_insert"
      BEFORE INSERT ON "ChapterRevision"
      BEGIN
        SELECT RAISE(ABORT, 'forced revision insert failure');
      END;
    `),
    );

    let finishUnrelatedWrite: (() => void) | undefined;
    let failUnrelatedWrite: ((error: unknown) => void) | undefined;
    const unrelatedWrite = new Promise<void>((resolve, reject) => {
      finishUnrelatedWrite = resolve;
      failUnrelatedWrite = reject;
    });
    vi.spyOn(crypto, "randomUUID").mockImplementationOnce(() => {
      queueMicrotask(() => {
        try {
          store
            .insert(character)
            .values({
              id: "db-03-unrelated-character",
              projectId,
              name: "Unrelated domain write",
              description: null,
              firstAppearance: null,
              attributes: null,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          finishUnrelatedWrite?.();
        } catch (error) {
          failUnrelatedWrite?.(error);
        }
      });
      return "db-03-failed-revision";
    });

    try {
      await expect(
        updateChapterRecord({
          data: {
            id: chapterId,
            title: "Changed title",
            content: "new body",
          },
          runInWriteSerialQueue: runDirectly,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.CHAPTER_UPDATE_FAILED });
      await unrelatedWrite;
    } finally {
      store.run(sql.raw(`DROP TRIGGER IF EXISTS "db03_fail_revision_insert";`));
    }

    expect(
      store.select().from(chapter).where(eq(chapter.id, chapterId)).get(),
    ).toMatchObject({ title: "Original title", content: "old body" });
    expect(
      store
        .select()
        .from(chapterBody)
        .where(eq(chapterBody.chapterId, chapterId))
        .get(),
    ).toMatchObject({ content: "old body" });
    expect(store.select().from(chapterRevision).all()).toHaveLength(0);
    expect(store.select().from(searchDirtyQueue).all()).toHaveLength(0);
    expect(store.select().from(memoryBuildJob).all()).toHaveLength(0);
    expect(
      store
        .select()
        .from(character)
        .where(eq(character.id, "db-03-unrelated-character"))
        .get(),
    ).toMatchObject({ name: "Unrelated domain write" });
  });
});
