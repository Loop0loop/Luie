import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const projectCreate = vi.fn();
  const projectDelete = vi.fn();
  const chapterCreateMany = vi.fn();
  const characterCreateMany = vi.fn();
  const termCreateMany = vi.fn();
  const factionCreateMany = vi.fn();
  const eventCreateMany = vi.fn();
  const worldEntityCreateMany = vi.fn();
  const entityRelationCreateMany = vi.fn();
  const snapshotCreateMany = vi.fn();
  const worldDocumentCreate = vi.fn();
  const scrapMemoCreateMany = vi.fn();
  const setProjectAttachmentPath = vi.fn();

  const tx = {
    project: {
      create: projectCreate,
      delete: projectDelete,
    },
    chapter: {
      createMany: chapterCreateMany,
    },
    character: {
      createMany: characterCreateMany,
    },
    term: {
      createMany: termCreateMany,
    },
    faction: {
      createMany: factionCreateMany,
    },
    event: {
      createMany: eventCreateMany,
    },
    worldEntity: {
      createMany: worldEntityCreateMany,
    },
    entityRelation: {
      createMany: entityRelationCreateMany,
    },
    snapshot: {
      createMany: snapshotCreateMany,
    },
    worldDocument: {
      create: worldDocumentCreate,
    },
    scrapMemo: {
      createMany: scrapMemoCreateMany,
    },
  };

  return {
    projectCreate,
    projectDelete,
    chapterCreateMany,
    characterCreateMany,
    termCreateMany,
    factionCreateMany,
    eventCreateMany,
    worldEntityCreateMany,
    entityRelationCreateMany,
    snapshotCreateMany,
    worldDocumentCreate,
    scrapMemoCreateMany,
    setProjectAttachmentPath,
    tx,
    transaction: vi.fn(async (callback: (tx: typeof tx) => unknown) => await callback(tx)),
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => ({
      $transaction: mocked.transaction,
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
    mocked.projectCreate.mockResolvedValue({
      id: "project-1",
      title: "Imported Project",
      description: "Imported synopsis",
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
      updatedAt: new Date("2026-03-12T03:00:00.000Z"),
      settings: {},
    });
  });

  it("persists imported world docs and scrap memos into replica storage", async () => {
    await applyProjectImportTransaction({
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

    expect(mocked.worldDocumentCreate).toHaveBeenCalledTimes(6);
    expect(mocked.worldDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          docType: "synopsis",
          payload: JSON.stringify({
            synopsis: "Imported synopsis",
            status: "working",
            updatedAt: "2026-03-12T01:00:00.000Z",
          }),
        }),
      }),
    );
    expect(mocked.worldDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          docType: "scrap",
          payload: JSON.stringify({
            schemaVersion: 2,
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
          }),
        }),
      }),
    );
    expect(mocked.scrapMemoCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: "memo-1",
          projectId: "project-1",
          title: "Memo",
          content: "Body",
          tags: JSON.stringify(["tag"]),
          sortOrder: 0,
        }),
      ],
    });
    expect(mocked.setProjectAttachmentPath).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      mocked.tx,
    );
  });
});
