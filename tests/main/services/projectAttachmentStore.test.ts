import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  deleteMany: vi.fn(async () => ({ count: 0 })),
  disconnect: vi.fn(async () => undefined),
  initialize: vi.fn(async () => undefined),
  projectFindFirst: vi.fn(),
  projectFindMany: vi.fn(),
  projectFindUnique: vi.fn(),
  projectUpdate: vi.fn(),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    disconnect: mocked.disconnect,
    getClient: () => ({
      character: {
        deleteMany: mocked.deleteMany,
      },
      characterAppearance: {
        deleteMany: mocked.deleteMany,
      },
      chapter: {
        deleteMany: mocked.deleteMany,
      },
      project: {
        findFirst: mocked.projectFindFirst,
        findMany: mocked.projectFindMany,
        findUnique: mocked.projectFindUnique,
        update: mocked.projectUpdate,
        deleteMany: mocked.deleteMany,
      },
      projectSettings: {
        deleteMany: mocked.deleteMany,
      },
      snapshot: {
        deleteMany: mocked.deleteMany,
      },
      term: {
        deleteMany: mocked.deleteMany,
      },
      termAppearance: {
        deleteMany: mocked.deleteMany,
      },
    }),
    initialize: mocked.initialize,
  },
}));

import {
  findProjectByAttachmentPath,
  getProjectAttachmentPath,
  hydrateProjectsWithAttachmentPaths,
  setProjectAttachmentPath,
} from "../../../src/main/services/core/project/projectAttachmentStore.js";

describe("projectAttachmentStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates project lists with attachment paths", async () => {
    mocked.projectFindMany.mockResolvedValue([
      { id: "project-1", projectPath: "/tmp/project-1.luie" },
      { id: "project-3", projectPath: "   " },
    ]);

    const projects = await hydrateProjectsWithAttachmentPaths([
      { id: "project-1", title: "One" },
      { id: "project-2", title: "Two" },
      { id: "project-3", title: "Three" },
    ]);

    expect(projects).toEqual([
      { id: "project-1", title: "One", projectPath: "/tmp/project-1.luie" },
      { id: "project-2", title: "Two", projectPath: null },
      { id: "project-3", title: "Three", projectPath: null },
    ]);
  });

  it("normalizes missing attachment paths to null", async () => {
    mocked.projectFindUnique.mockResolvedValue({
      projectPath: "   ",
    });

    await expect(getProjectAttachmentPath("project-1")).resolves.toBeNull();
  });

  it("writes attachment updates through the project store", async () => {
    mocked.projectUpdate.mockResolvedValue({
      id: "project-1",
    });

    await setProjectAttachmentPath("project-1", "/tmp/project-1.luie");

    expect(mocked.projectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: { projectPath: "/tmp/project-1.luie" },
    });
  });

  it("finds projects by attachment path", async () => {
    mocked.projectFindFirst.mockResolvedValue({
      id: "project-1",
      title: "Imported",
      projectPath: "/tmp/imported.luie",
      updatedAt: new Date("2026-03-11T00:00:00.000Z"),
    });

    await expect(
      findProjectByAttachmentPath("/tmp/imported.luie"),
    ).resolves.toMatchObject({
      id: "project-1",
      title: "Imported",
      projectPath: "/tmp/imported.luie",
    });
  });
});
