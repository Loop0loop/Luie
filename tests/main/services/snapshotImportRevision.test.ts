// TEST_LEVEL: REAL_DB_INTEGRATION
// PROVES: snapshot import writes and marks one captured full-checkpoint revision

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ProjectRevisionStoreModule from "../../../src/main/services/core/project/projectRevisionStore.js";

const mocked = vi.hoisted(() => ({
  events: [] as string[],
  failMark: false,
  markProjectExported: vi.fn(),
  writeLuieContainer: vi.fn(),
}));

vi.mock(
  "../../../src/main/services/features/snapshot/snapshotArtifacts.js",
  () => ({
    readFullSnapshotArtifact: vi.fn(async () => ({
      meta: {
        version: "1.0.0",
        timestamp: "2026-03-12T03:00:00.000Z",
        snapshotId: "snapshot-import",
        projectId: "source-project",
      },
      data: {
        project: {
          id: "source-project",
          title: "Snapshot Import Project",
          description: "Snapshot description",
          createdAt: "2026-03-12T00:00:00.000Z",
          updatedAt: "2026-03-12T03:00:00.000Z",
        },
        chapters: [
          {
            id: "source-chapter",
            title: "Chapter 1",
            content: "snapshot-body",
            order: 0,
            wordCount: 13,
            createdAt: "2026-03-12T00:00:00.000Z",
            updatedAt: "2026-03-12T03:00:00.000Z",
          },
        ],
        characters: [],
        terms: [],
      },
    })),
  }),
);

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  writeLuieContainer: (...args: unknown[]) => mocked.writeLuieContainer(...args),
}));

vi.mock(
  "../../../src/main/services/core/project/projectRevisionStore.js",
  async (importActual) => {
    const actual = await importActual<typeof ProjectRevisionStoreModule>();
    mocked.markProjectExported.mockImplementation(
      async (...args: Parameters<typeof actual.markProjectExported>) => {
        mocked.events.push(`mark:${args[1]}`);
        if (mocked.failMark) throw new Error("mark failed");
        return await actual.markProjectExported(...args);
      },
    );
    return {
      ...actual,
      markProjectExported: (...args: Parameters<typeof actual.markProjectExported>) =>
        mocked.markProjectExported(...args),
    };
  },
);

import { db } from "../../../src/main/database/index.js";
import * as schema from "../../../src/main/database/schema/index.js";
import { importSnapshotFromFile } from "../../../src/main/services/features/snapshot/snapshotImportFromFile.js";
import { getProjectRevisionState } from "../../../src/main/services/core/project/projectRevisionStore.js";

const logger = { info: vi.fn(), error: vi.fn() };

describe("snapshot import revision", () => {
  beforeEach(() => {
    mocked.events.length = 0;
    mocked.failMark = false;
    mocked.markProjectExported.mockClear();
    mocked.writeLuieContainer.mockReset().mockImplementation(async () => {
      mocked.events.push("write:start", "write:success");
    });
    logger.error.mockClear();
    logger.info.mockClear();
  });

  it("creates an attachment and marks the captured revision after the atomic write", async () => {
    const created = await importSnapshotFromFile("/tmp/snapshot.snap", logger);
    const [projectRow] = await db
      .getClient()
      .select({ projectPath: schema.project.projectPath })
      .from(schema.project)
      .where(eq(schema.project.id, created.id));
    const [attachment] = await db
      .getClient()
      .select()
      .from(schema.projectAttachment)
      .where(eq(schema.projectAttachment.projectId, created.id));
    const [body] = await db
      .getClient()
      .select()
      .from(schema.chapterBody)
      .innerJoin(schema.chapter, eq(schema.chapter.id, schema.chapterBody.chapterId))
      .where(eq(schema.chapter.projectId, created.id));
    const state = await getProjectRevisionState(created.id);

    expect(projectRow.projectPath).toBeNull();
    expect(attachment.projectPath).toMatch(/\.luie$/);
    expect(state.exportedRevision).toBe(state.revision);
    expect(body.ChapterBody.content).toBe("snapshot-body");
    expect(mocked.events).toEqual([
      "write:start",
      "write:success",
      `mark:${state.revision}`,
    ]);
  });

  it("rolls back Project and ProjectAttachment when the writer fails", async () => {
    mocked.writeLuieContainer.mockImplementationOnce(async () => {
      mocked.events.push("write:start");
      throw new Error("writer failed");
    });

    await expect(
      importSnapshotFromFile("/tmp/snapshot.snap", logger),
    ).rejects.toThrow("writer failed");
    expect(
      await db
        .getClient()
        .select()
        .from(schema.project)
        .where(eq(schema.project.title, "Snapshot Import Project")),
    ).toHaveLength(0);
    expect(await db.getClient().select().from(schema.projectAttachment)).toHaveLength(0);
    expect(mocked.markProjectExported).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalledWith(
      expect.stringContaining("preserving written recovery artifact"),
      expect.anything(),
    );
  });

  it("rejects and rolls back Project and ProjectAttachment when marking fails", async () => {
    mocked.failMark = true;

    await expect(
      importSnapshotFromFile("/tmp/snapshot.snap", logger),
    ).rejects.toThrow("mark failed");
    expect(
      await db
        .getClient()
        .select()
        .from(schema.project)
        .where(eq(schema.project.title, "Snapshot Import Project")),
    ).toHaveLength(0);
    expect(await db.getClient().select().from(schema.projectAttachment)).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("preserving written recovery artifact"),
      expect.objectContaining({
        projectPath: expect.stringMatching(/\.luie$/),
        recoveryArtifactPreserved: true,
      }),
    );
  });

  it("keeps a mutation during the write dirty above the captured revision", async () => {
    mocked.writeLuieContainer.mockImplementationOnce(async (input: unknown) => {
      mocked.events.push("write:start");
      const projectId = (input as { payload: { meta: { projectId: string } } }).payload.meta.projectId;
      const now = new Date().toISOString();
      await db.getClient().insert(schema.character).values({
        id: `concurrent-${projectId}`,
        projectId,
        name: "Concurrent edit",
        createdAt: now,
        updatedAt: now,
      });
      mocked.events.push("write:success");
    });

    const created = await importSnapshotFromFile("/tmp/snapshot.snap", logger);
    const state = await getProjectRevisionState(created.id);

    expect(state.revision).toBe(state.exportedRevision + 1);
  });
});
