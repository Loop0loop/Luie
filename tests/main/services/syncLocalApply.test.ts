import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import {
  chapter,
  chapterBody,
  project,
  scrapMemo,
  worldDocument,
} from "../../../src/main/database/schema/index.js";
import {
  applyReplicaWorldState,
  upsertChapter,
} from "../../../src/main/services/features/sync/syncLocalApply.js";
import { createEmptySyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

describe("syncLocalApply.applyReplicaWorldState", () => {
  it("touches project freshness when world documents are materialized", () => {
    const worldDocumentValues: unknown[] = [];
    const projectUpdates: unknown[] = [];

    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const onConflictDoUpdate = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          if (table === worldDocument) worldDocumentValues.push(values);
          return { onConflictDoUpdate, run };
        }),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((values: unknown) => {
          if (table === project) projectUpdates.push(values);
          return { where };
        }),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.worldDocuments.push({
      id: "project-1:synopsis",
      userId: "user-1",
      projectId: "project-1",
      docType: "synopsis",
      payload: {
        synopsis: "hello",
      },
      updatedAt: "2026-03-03T00:00:00.000Z",
    });

    applyReplicaWorldState(tx, bundle, new Set());

    expect(tx.insert).toHaveBeenCalledWith(worldDocument);
    expect(worldDocumentValues).toHaveLength(1);
    expect(worldDocumentValues[0]).toMatchObject({
      id: "project-1:synopsis",
      projectId: "project-1",
      docType: "synopsis",
    });
    expect(
      JSON.parse((worldDocumentValues[0] as { payload: string }).payload),
    ).toMatchObject({
      synopsis: "hello",
    });

    expect(tx.delete).not.toHaveBeenCalledWith(scrapMemo);
    expect(tx.update).toHaveBeenCalledWith(project);
    expect(projectUpdates[0]).toMatchObject({
      updatedAt: expect.any(String),
    });
  });

  it("applies the latest world document tombstone", () => {
    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({ run })),
          run,
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where })),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.worldDocuments.push(
      {
        id: "project-1:synopsis:old",
        userId: "user-1",
        projectId: "project-1",
        docType: "synopsis",
        payload: { synopsis: "old" },
        updatedAt: "2026-03-03T00:00:00.000Z",
      },
      {
        id: "project-1:synopsis:deleted",
        userId: "user-1",
        projectId: "project-1",
        docType: "synopsis",
        payload: null,
        updatedAt: "2026-03-04T00:00:00.000Z",
        deletedAt: "2026-03-04T00:00:00.000Z",
      },
    );

    applyReplicaWorldState(tx, bundle, new Set());

    expect(tx.delete).toHaveBeenCalledWith(worldDocument);
    expect(tx.insert).not.toHaveBeenCalledWith(worldDocument);
    expect(tx.update).toHaveBeenCalledWith(project);
  });

  it("skips invalid JSON world document strings instead of overwriting with defaults", () => {
    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({ run })),
          run,
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where })),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.worldDocuments.push({
      id: "project-1:graph",
      userId: "user-1",
      projectId: "project-1",
      docType: "graph",
      payload: "not-json",
      updatedAt: "2026-03-03T00:00:00.000Z",
    });

    applyReplicaWorldState(tx, bundle, new Set());

    expect(tx.insert).not.toHaveBeenCalledWith(worldDocument);
  });

  it("materializes scrap memos from replica memo rows", () => {
    const worldDocumentValues: unknown[] = [];
    const scrapMemoValues: unknown[] = [];

    const run = vi.fn();
    const where = vi.fn(() => ({ run }));
    const onConflictDoUpdate = vi.fn(() => ({ run }));
    const tx = {
      delete: vi.fn(() => ({ where })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          if (table === worldDocument) worldDocumentValues.push(values);
          if (table === scrapMemo) scrapMemoValues.push(values);
          return { onConflictDoUpdate, run };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({ where })),
      })),
    } as never;

    const bundle = createEmptySyncBundle();
    bundle.projects.push({
      id: "project-1",
      userId: "user-1",
      title: "Novel",
      description: null,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    bundle.memos.push({
      id: "memo-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Clue",
      content: "Hidden door",
      tags: ["plot"],
      createdAt: "2026-03-03T00:00:00.000Z",
      updatedAt: "2026-03-04T00:00:00.000Z",
    });

    applyReplicaWorldState(tx, bundle, new Set());

    expect(worldDocumentValues).toHaveLength(1);
    expect(worldDocumentValues[0]).toMatchObject({
      id: "project-1:scrap",
      projectId: "project-1",
      docType: "scrap",
    });
    expect(scrapMemoValues).toHaveLength(1);
    expect(tx.delete).toHaveBeenCalledWith(scrapMemo);
    expect(scrapMemoValues[0]).toMatchObject([
      {
        id: "memo-1",
        projectId: "project-1",
        title: "Clue",
        content: "Hidden door",
        tags: JSON.stringify(["plot"]),
        sortOrder: 0,
      },
    ]);
  });
});

describe("syncLocalApply.upsertChapter", () => {
  it("runs existing update, new insert, and ChapterBody upserts", () => {
    const chapterValues: Array<Record<string, unknown>> = [];
    const chapterInsertValues: Array<Record<string, unknown>> = [];
    const bodyValues: Array<Record<string, unknown>> = [];
    const bodyConflictValues: Array<Record<string, unknown>> = [];
    const get = vi
      .fn()
      .mockReturnValueOnce({ id: "chapter-1" })
      .mockReturnValueOnce(undefined);
    const chapterUpdateRun = vi.fn();
    const chapterInsertRun = vi.fn();
    const otherRun = vi.fn();
    const bodyConflictRun = vi.fn();
    const tx = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get,
            })),
          })),
        })),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((values: Record<string, unknown>) => {
          if (table === chapter) chapterValues.push(values);
          return {
            where: vi.fn(() => ({
              run: table === chapter ? chapterUpdateRun : otherRun,
            })),
          };
        }),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: Record<string, unknown>) => {
          if (table === chapter) chapterInsertValues.push(values);
          if (table === chapterBody) bodyValues.push(values);
          return {
            run: table === chapter ? chapterInsertRun : otherRun,
            onConflictDoUpdate: vi.fn(
              (config: {
                set: Record<string, unknown>;
                target: unknown[];
              }) => {
                if (table === chapterBody) {
                  expect(config.target).toEqual([chapterBody.chapterId]);
                  bodyConflictValues.push(config.set);
                  return { run: bodyConflictRun };
                }
                return { run: otherRun };
              },
            ),
          };
        }),
      })),
    } as never;

    upsertChapter(tx, {
      id: "chapter-1",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter 1",
      content: "remote-body",
      synopsis: null,
      order: 0,
      wordCount: 11,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
      deletedAt: null,
    });
    upsertChapter(tx, {
      id: "chapter-2",
      userId: "user-1",
      projectId: "project-1",
      title: "Chapter 2",
      content: "new-body",
      synopsis: null,
      order: 1,
      wordCount: 8,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-03T00:00:00.000Z",
      deletedAt: null,
    });

    expect(chapterValues[0]?.content).toBe("remote-body");
    expect(chapterUpdateRun).toHaveBeenCalledTimes(1);
    expect(chapterInsertValues[0]).toMatchObject({
      id: "chapter-2",
      content: "new-body",
    });
    expect(chapterInsertRun).toHaveBeenCalledTimes(1);
    expect(bodyValues[0]).toMatchObject({
      chapterId: "chapter-1",
      content: "remote-body",
      contentHash: createHash("sha256").update("remote-body").digest("hex"),
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    expect(bodyConflictValues[0]).toMatchObject({
      content: "remote-body",
      contentHash: createHash("sha256").update("remote-body").digest("hex"),
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
    expect(bodyValues[1]).toMatchObject({
      chapterId: "chapter-2",
      content: "new-body",
    });
    expect(bodyConflictValues[1]).toMatchObject({
      content: "new-body",
    });
    expect(bodyConflictRun).toHaveBeenCalledTimes(2);
  });
});
