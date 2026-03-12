import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const access = vi.fn();
  const readLuieContainerEntry = vi.fn();
  const findUnique = vi.fn();
  const findProjectByAttachmentPath = vi.fn();
  const setProjectAttachmentPath = vi.fn();
  const applyProjectImportTransaction = vi.fn();
  const buildChapterCreateRows = vi.fn();
  const buildCharacterCreateRows = vi.fn();
  const buildTermCreateRows = vi.fn();
  const buildSnapshotCreateRows = vi.fn();
  const buildGraphCreateRows = vi.fn();

  return {
    access,
    readLuieContainerEntry,
    findUnique,
    findProjectByAttachmentPath,
    setProjectAttachmentPath,
    applyProjectImportTransaction,
    buildChapterCreateRows,
    buildCharacterCreateRows,
    buildTermCreateRows,
    buildSnapshotCreateRows,
    buildGraphCreateRows,
  };
});

vi.mock("fs", () => ({
  promises: {
    access: (...args: unknown[]) => mocked.access(...args),
  },
}));

vi.mock("../../../src/main/utils/luiePackage.js", () => ({
  ensureLuieExtension: (value: string) => value,
}));

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  readLuieContainerEntry: (...args: unknown[]) =>
    mocked.readLuieContainerEntry(...args),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => ({
      project: {
        findUnique: mocked.findUnique,
      },
    }),
  },
}));

vi.mock("../../../src/main/services/core/project/projectAttachmentStore.js", () => ({
  findProjectByAttachmentPath: (...args: unknown[]) =>
    mocked.findProjectByAttachmentPath(...args),
  setProjectAttachmentPath: (...args: unknown[]) =>
    mocked.setProjectAttachmentPath(...args),
}));

vi.mock("../../../src/main/services/core/project/projectImportTransaction.js", () => ({
  applyProjectImportTransaction: (...args: unknown[]) =>
    mocked.applyProjectImportTransaction(...args),
}));

vi.mock("../../../src/main/services/core/project/projectImportCodec.js", () => ({
  buildChapterCreateRows: (...args: unknown[]) => mocked.buildChapterCreateRows(...args),
  buildCharacterCreateRows: (...args: unknown[]) =>
    mocked.buildCharacterCreateRows(...args),
  buildTermCreateRows: (...args: unknown[]) => mocked.buildTermCreateRows(...args),
  buildSnapshotCreateRows: (...args: unknown[]) =>
    mocked.buildSnapshotCreateRows(...args),
}));

vi.mock("../../../src/main/services/core/project/projectImportGraph.js", () => ({
  buildGraphCreateRows: (...args: unknown[]) => mocked.buildGraphCreateRows(...args),
}));

import { openLuieProjectPackage } from "../../../src/main/services/core/project/projectImportOpen.js";

describe("projectImportOpen", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocked.access.mockResolvedValue(undefined);
    mocked.findProjectByAttachmentPath.mockResolvedValue(null);
    mocked.findUnique.mockResolvedValue(null);
    mocked.buildChapterCreateRows.mockResolvedValue([
      {
        id: "chapter-1",
        projectId: "project-1",
        title: "Chapter 1",
        content: "# Chapter 1",
        order: 1,
        createdAt: new Date("2026-03-12T00:00:00.000Z"),
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
    ]);
    mocked.buildCharacterCreateRows.mockReturnValue([]);
    mocked.buildTermCreateRows.mockReturnValue([]);
    mocked.buildSnapshotCreateRows.mockReturnValue([]);
    mocked.buildGraphCreateRows.mockReturnValue({
      charactersForCreate: [],
      termsForCreate: [],
      factionsForCreate: [],
      eventsForCreate: [],
      worldEntitiesForCreate: [],
      relationsForCreate: [],
    });
    mocked.applyProjectImportTransaction.mockResolvedValue({
      id: "project-1",
      title: "Project 1",
      projectPath: "/tmp/project-1.luie",
    });
    mocked.readLuieContainerEntry.mockImplementation(async (_packagePath: string, entryPath: string) => {
      switch (entryPath) {
        case "meta.json":
          return JSON.stringify({
            format: "luie",
            version: 1,
            projectId: "project-1",
            title: "Project 1",
            description: "From meta",
            updatedAt: "2026-03-12T03:00:00.000Z",
            chapters: [
              {
                id: "chapter-1",
                title: "Chapter 1",
                order: 1,
                file: "manuscript/chapter-1.md",
              },
            ],
          });
        case "world/characters.json":
          return JSON.stringify({ characters: [] });
        case "world/terms.json":
          return JSON.stringify({ terms: [] });
        case "snapshots/index.json":
          return JSON.stringify({ snapshots: [] });
        case "world/synopsis.json":
          return JSON.stringify({
            synopsis: "Imported synopsis",
            status: "working",
            updatedAt: "2026-03-12T01:00:00.000Z",
          });
        case "world/plot-board.json":
          return JSON.stringify({
            columns: [{ id: "plot-col", title: "Arc", cards: [] }],
            updatedAt: "2026-03-12T01:30:00.000Z",
          });
        case "world/map-drawing.json":
          return JSON.stringify({
            paths: [{ id: "path-1", type: "path", color: "#000000" }],
            updatedAt: "2026-03-12T01:45:00.000Z",
          });
        case "world/mindmap.json":
          return JSON.stringify({
            nodes: [],
            edges: [],
            updatedAt: "2026-03-12T02:00:00.000Z",
          });
        case "world/scrap-memos.json":
          return JSON.stringify({
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
          });
        case "world/graph.json":
          return JSON.stringify({
            nodes: [],
            edges: [],
            updatedAt: "2026-03-12T02:30:00.000Z",
          });
        case "manuscript/chapter-1.md":
          return "# Chapter 1";
        default:
          return null;
      }
    });
  });

  it("hydrates imported world documents into the same transaction surface used by replica state", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const result = await openLuieProjectPackage({
      packagePath: "/tmp/project-1.luie",
      logger,
      exportRecoveredPackage: vi.fn(),
      getProjectById: vi.fn(),
    });

    expect(result).toMatchObject({
      conflict: "luie-newer",
      project: { id: "project-1" },
    });
    expect(mocked.applyProjectImportTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedProjectId: "project-1",
        resolvedPath: "/tmp/project-1.luie",
        worldSynopsis: expect.objectContaining({
          synopsis: "Imported synopsis",
          status: "working",
        }),
        worldPlot: expect.objectContaining({
          columns: expect.arrayContaining([
            expect.objectContaining({ id: "plot-col", title: "Arc", cards: [] }),
          ]),
        }),
        worldDrawing: expect.objectContaining({
          paths: expect.arrayContaining([
            expect.objectContaining({ id: "path-1", type: "path", color: "#000000" }),
          ]),
        }),
        worldMindmap: expect.objectContaining({
          nodes: [],
          edges: [],
        }),
        worldScrapMemos: expect.objectContaining({
          memos: expect.arrayContaining([
            expect.objectContaining({ id: "memo-1", title: "Memo", content: "Body" }),
          ]),
        }),
        worldGraph: expect.objectContaining({
          nodes: [],
          edges: [],
        }),
      }),
    );
  });
});
