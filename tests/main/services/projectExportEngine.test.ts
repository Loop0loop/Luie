import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const projectFindUnique = vi.fn();
  const getProjectAttachmentPath = vi.fn();
  const readLuieContainerEntry = vi.fn();
  const writeLuieContainer = vi.fn();
  const getDocument = vi.fn();
  const getScrapMemos = vi.fn();

  return {
    projectFindUnique,
    getProjectAttachmentPath,
    readLuieContainerEntry,
    writeLuieContainer,
    getDocument,
    getScrapMemos,
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    getClient: () => ({
      project: {
        findUnique: mocked.projectFindUnique,
      },
    }),
  },
}));

vi.mock("../../../src/main/services/core/project/projectAttachmentStore.js", () => ({
  getProjectAttachmentPath: (...args: unknown[]) =>
    mocked.getProjectAttachmentPath(...args),
}));

vi.mock("../../../src/main/services/io/luieContainer.js", () => ({
  readLuieContainerEntry: (...args: unknown[]) =>
    mocked.readLuieContainerEntry(...args),
  writeLuieContainer: (...args: unknown[]) => mocked.writeLuieContainer(...args),
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getAll: () => ({
      snapshotExportLimit: 5,
    }),
  },
}));

vi.mock("../../../src/main/services/features/worldReplicaService.js", () => ({
  worldReplicaService: {
    getDocument: (...args: unknown[]) => mocked.getDocument(...args),
    getScrapMemos: (...args: unknown[]) => mocked.getScrapMemos(...args),
  },
}));

import { exportProjectPackageWithOptions } from "../../../src/main/services/core/project/projectExportEngine.js";

describe("projectExportEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocked.projectFindUnique.mockResolvedValue({
      id: "project-1",
      title: "Project 1",
      description: null,
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
      updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      chapters: [],
      characters: [],
      terms: [],
      factions: [],
      events: [],
      worldEntities: [],
      entityRelations: [],
      snapshots: [],
    });
    mocked.getProjectAttachmentPath.mockResolvedValue("/tmp/project-1.luie");
    mocked.writeLuieContainer.mockResolvedValue(undefined);
    mocked.getDocument.mockImplementation(async ({ docType }: { docType: string }) => {
      if (docType === "synopsis") {
        return {
          found: true,
          payload: {
            synopsis: "replica synopsis",
            status: "working",
            updatedAt: "2026-03-12T01:00:00.000Z",
          },
        };
      }

      return {
        found: false,
        payload: null,
      };
    });
    mocked.getScrapMemos.mockResolvedValue({
      found: false,
      data: null,
    });
    mocked.readLuieContainerEntry.mockImplementation(async (_projectPath: string, entryPath: string) => {
      if (entryPath === "world/plot-board.json") {
        return JSON.stringify({
          columns: [{ id: "plot-col", title: "Arc", cards: [] }],
        });
      }
      if (entryPath === "world/scrap-memos.json") {
        return JSON.stringify({
          memos: [
            {
              id: "memo-1",
              title: "Memo",
              content: "Body",
              tags: ["tag"],
              updatedAt: "2026-03-12T02:00:00.000Z",
            },
          ],
        });
      }
      return null;
    });
  });

  it("exports from replica first and only falls back to package for missing world docs", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const exported = await exportProjectPackageWithOptions({
      projectId: "project-1",
      logger,
    });

    expect(exported).toBe(true);
    expect(mocked.writeLuieContainer).toHaveBeenCalledTimes(1);
    const payload = mocked.writeLuieContainer.mock.calls[0]?.[0]?.payload as
      | {
          synopsis?: { synopsis?: string; status?: string };
          plot?: { columns?: Array<{ id: string }> };
          memos?: { memos?: Array<{ id: string }> };
        }
      | undefined;

    expect(payload?.synopsis).toMatchObject({
      synopsis: "replica synopsis",
      status: "working",
    });
    expect(payload?.plot).toMatchObject({
      columns: [{ id: "plot-col" }],
    });
    expect(payload?.memos).toMatchObject({
      memos: [{ id: "memo-1" }],
    });
    expect(mocked.readLuieContainerEntry).not.toHaveBeenCalledWith(
      "/tmp/project-1.luie",
      "world/synopsis.json",
      expect.anything(),
    );
  });

  it("always writes sqlite-backed .luie output", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };

    const exported = await exportProjectPackageWithOptions({
      projectId: "project-1",
      logger,
      options: {
        targetPath: "/tmp/project-1-sqlite.luie",
      },
    });

    expect(exported).toBe(true);
    expect(mocked.writeLuieContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        targetPath: "/tmp/project-1-sqlite.luie",
        payload: expect.objectContaining({
          meta: expect.objectContaining({
            container: "sqlite",
            version: 2,
          }),
        }),
      }),
    );
  });
});
