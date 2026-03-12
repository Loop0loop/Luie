import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const projectFindUnique = vi.fn();
  const getProjectAttachmentPath = vi.fn();
  const readLuieEntry = vi.fn();
  const writeLuiePackage = vi.fn();
  const getDocument = vi.fn();
  const getScrapMemos = vi.fn();

  return {
    projectFindUnique,
    getProjectAttachmentPath,
    readLuieEntry,
    writeLuiePackage,
    getDocument,
    getScrapMemos,
  };
});

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
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

vi.mock("../../../src/main/utils/luiePackage.js", () => ({
  readLuieEntry: (...args: unknown[]) => mocked.readLuieEntry(...args),
}));

vi.mock("../../../src/main/services/io/luiePackageWriter.js", () => ({
  writeLuiePackage: (...args: unknown[]) => mocked.writeLuiePackage(...args),
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
    mocked.writeLuiePackage.mockResolvedValue(undefined);
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
    mocked.readLuieEntry.mockImplementation(async (_projectPath: string, entryPath: string) => {
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
    expect(mocked.writeLuiePackage).toHaveBeenCalledTimes(1);
    const payload = mocked.writeLuiePackage.mock.calls[0]?.[1] as
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
    expect(mocked.readLuieEntry).not.toHaveBeenCalledWith(
      "/tmp/project-1.luie",
      "world/synopsis.json",
      expect.anything(),
    );
  });
});
