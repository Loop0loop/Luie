import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const insertFn = vi.fn();
  const deleteFn = vi.fn();
  const setProjectAttachmentPath = vi.fn();

  const returningData = [
    {
      id: "project-1",
      title: "Imported Project",
      description: "Imported synopsis",
      createdAt: "2026-03-12T00:00:00.000Z",
      updatedAt: "2026-03-12T03:00:00.000Z",
    },
  ];

  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn((vals: unknown) => {
        insertFn(vals);
        return {
          run: vi.fn(() => undefined),
          onConflictDoUpdate: vi.fn(() => ({
            run: vi.fn(() => undefined),
          })),
          returning: vi.fn(() => returningData),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        deleteFn();
        return {
          run: vi.fn(() => undefined),
        };
      }),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(() => returningData[0]),
        })),
      })),
    })),
  };

  return {
    insertFn,
    deleteFn,
    setProjectAttachmentPath,
    tx,
    transaction: vi.fn((callback: (tx: unknown) => unknown) =>
      callback(mocked.tx),
    ),
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    getClient: () => ({
      transaction: mocked.transaction,
    }),
  },
}));

vi.mock(
  "../../../src/main/services/core/project/projectAttachmentStore.js",
  () => ({
    setProjectAttachmentPath: (...args: unknown[]) =>
      mocked.setProjectAttachmentPath(...args),
  }),
);

import { applyProjectImportTransaction } from "../../../src/main/services/core/project/projectImportTransaction.js";

describe("projectImportTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.insertFn.mockReturnValue({
      onConflictDoUpdate: vi.fn(async () => undefined),
      returning: vi.fn(async () => [
        {
          id: "project-1",
          title: "Imported Project",
          description: "Imported synopsis",
          createdAt: "2026-03-12T00:00:00.000Z",
          updatedAt: "2026-03-12T03:00:00.000Z",
        },
      ]),
    });
  });

  it("persists imported world docs and scrap memos into replica storage", async () => {
    const result = await applyProjectImportTransaction({
      resolvedProjectId: "project-1",
      legacyProjectId: null,
      existing: null,
      meta: {
        title: "Imported Project",
        updatedAt: "2026-03-12T03:00:00.000Z",
      },
      worldSynopsis: {
        synopsis: "Imported synopsis",
        status: "working",
        updatedAt: "2026-03-12T01:00:00.000Z",
      },
      worldPlot: {
        columns: [{ id: "plot-col", title: "Arc", cards: [] }],
        updatedAt: "2026-03-12T01:30:00.000Z",
      },
      worldDrawing: {
        paths: [{ id: "path-1", type: "path", color: "#000000" }],
        updatedAt: "2026-03-12T01:45:00.000Z",
      },
      worldMindmap: {
        nodes: [],
        edges: [],
        updatedAt: "2026-03-12T02:00:00.000Z",
      },
      worldScrapMemos: {
        memos: [
          {
            id: "memo-1",
            title: "Memo",
            content: "Body",
            tags: ["tag"],
            updatedAt: "2026-03-12T02:15:00.000Z",
          },
        ],
        updatedAt: "2026-03-12T02:15:00.000Z",
      },
      worldGraph: {
        nodes: [],
        edges: [],
      },
      resolvedPath: "/tmp/project-1.luie",
      chaptersForCreate: [],
      charactersForCreate: [],
      termsForCreate: [],
      factionsForCreate: [],
      eventsForCreate: [],
      worldEntitiesForCreate: [],
      relationsForCreate: [],
      snapshotsForCreate: [],
      memoryCanonical: {
        schemaVersion: 1,
        exportedAt: "2026-03-12T03:00:00.000Z",
        tables: {
          MemoryEntity: [
            {
              id: "memory-entity-1",
              projectId: "original-project",
              entityType: "character",
              canonicalName: "Alice",
              status: "confirmed",
              updatedAt: "2026-03-12T03:00:00.000Z",
            },
          ],
        },
      },
    });

    expect(mocked.transaction).toHaveBeenCalledTimes(1);
    expect(mocked.insertFn).toHaveBeenCalled();
    expect(mocked.insertFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "project-1:MemoryEntity:memory-entity-1",
          projectId: "project-1",
          status: "confirmed",
        }),
      ]),
    );
    expect(result.id).toBe("project-1");
    expect(result.projectPath).toBe("/tmp/project-1.luie");
  });

  it("uses the freshest imported content timestamp for project.updatedAt", async () => {
    await applyProjectImportTransaction({
      resolvedProjectId: "project-1",
      legacyProjectId: null,
      existing: null,
      meta: {
        title: "Imported Project",
        updatedAt: "2026-03-12T00:00:00.000Z",
      },
      worldSynopsis: {
        synopsis: "Imported synopsis",
        status: "working",
        updatedAt: "2026-03-12T05:00:00.000Z",
      },
      resolvedPath: "/tmp/project-1.luie",
      chaptersForCreate: [],
      charactersForCreate: [],
      termsForCreate: [],
      factionsForCreate: [],
      eventsForCreate: [],
      worldEntitiesForCreate: [],
      relationsForCreate: [],
      snapshotsForCreate: [],
    });

    expect(mocked.insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: "2026-03-12T05:00:00.000Z",
      }),
    );
  });
});
