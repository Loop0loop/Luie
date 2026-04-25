import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const insertFn = vi.fn();
  const deleteFn = vi.fn();
  const setProjectAttachmentPath = vi.fn();

  const returningData = [{
    id: "project-1",
    title: "Imported Project",
    description: "Imported synopsis",
    createdAt: "2026-03-12T00:00:00.000Z",
    updatedAt: "2026-03-12T03:00:00.000Z",
  }];

  const tx = {
    insert: vi.fn(() => ({
      values: vi.fn((vals: unknown) => {
        insertFn(vals);
        return {
          onConflictDoUpdate: vi.fn(async () => undefined),
          returning: vi.fn(async () => returningData),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => {
        deleteFn();
        return {};
      }),
    })),
  };

  return {
    insertFn,
    deleteFn,
    setProjectAttachmentPath,
    tx,
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => await callback(mocked.tx)),
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getDrizzleClient: () => ({
      transaction: mocked.transaction,
    }),
  },
}));

vi.mock("../../../src/main/services/core/project/projectAttachmentStore.js", () => ({
  setProjectAttachmentPath: (...args: unknown[]) =>
    mocked.setProjectAttachmentPath(...args),
}));

import { applyProjectImportTransaction } from "../../../src/main/services/core/project/projectImportTransaction.js";

describe("projectImportTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.insertFn.mockReturnValue({
      onConflictDoUpdate: vi.fn(async () => undefined),
      returning: vi.fn(async () => [{
        id: "project-1",
        title: "Imported Project",
        description: "Imported synopsis",
        createdAt: "2026-03-12T00:00:00.000Z",
        updatedAt: "2026-03-12T03:00:00.000Z",
      }]),
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
    });

    expect(mocked.transaction).toHaveBeenCalledTimes(1);
    expect(mocked.insertFn).toHaveBeenCalled();
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
