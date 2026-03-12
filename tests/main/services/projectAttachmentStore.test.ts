import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  deleteMany: vi.fn(async () => ({ count: 0 })),
  disconnect: vi.fn(async () => undefined),
  initialize: vi.fn(async () => undefined),
  projectAttachmentDeleteMany: vi.fn(async () => ({ count: 0 })),
  projectAttachmentFindFirst: vi.fn(),
  projectAttachmentFindMany: vi.fn(),
  projectAttachmentFindUnique: vi.fn(),
  projectAttachmentUpsert: vi.fn(),
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
      projectAttachment: {
        deleteMany: mocked.projectAttachmentDeleteMany,
        findFirst: mocked.projectAttachmentFindFirst,
        findMany: mocked.projectAttachmentFindMany,
        findUnique: mocked.projectAttachmentFindUnique,
        upsert: mocked.projectAttachmentUpsert,
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
  migrateLegacyProjectAttachments,
  setProjectAttachmentPath,
} from "../../../src/main/services/core/project/projectAttachmentStore.js";

describe("projectAttachmentStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hydrates project lists with attachment paths", async () => {
    mocked.projectAttachmentFindMany.mockResolvedValue([
      { projectId: "project-1", projectPath: "/tmp/project-1.luie" },
    ]);
    mocked.projectFindMany.mockResolvedValue([
      { id: "project-1", projectPath: null },
      { id: "project-2", projectPath: "/tmp/project-2-legacy.luie" },
      { id: "project-3", projectPath: "   " },
    ]);

    const projects = await hydrateProjectsWithAttachmentPaths([
      { id: "project-1", title: "One" },
      { id: "project-2", title: "Two" },
      { id: "project-3", title: "Three" },
    ]);

    expect(projects).toEqual([
      { id: "project-1", title: "One", projectPath: "/tmp/project-1.luie" },
      { id: "project-2", title: "Two", projectPath: "/tmp/project-2-legacy.luie" },
      { id: "project-3", title: "Three", projectPath: null },
    ]);
  });

  it("normalizes missing attachment paths to null", async () => {
    mocked.projectAttachmentFindUnique.mockResolvedValue(null);
    mocked.projectFindUnique.mockResolvedValue({
      projectPath: "   ",
    });

    await expect(getProjectAttachmentPath("project-1")).resolves.toBeNull();
  });

  it("writes attachment updates through the attachment store and clears legacy paths", async () => {
    mocked.projectAttachmentUpsert.mockResolvedValue({
      projectId: "project-1",
      projectPath: "/tmp/project-1.luie",
    });
    mocked.projectFindUnique.mockResolvedValue({
      projectPath: "/tmp/legacy-project-1.luie",
    });
    mocked.projectUpdate.mockResolvedValue({
      id: "project-1",
    });

    await setProjectAttachmentPath("project-1", "/tmp/project-1.luie");

    expect(mocked.projectAttachmentUpsert).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      create: {
        projectId: "project-1",
        projectPath: "/tmp/project-1.luie",
      },
      update: {
        projectPath: "/tmp/project-1.luie",
      },
    });
    expect(mocked.projectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: { projectPath: null },
    });
  });

  it("finds projects by attachment path", async () => {
    mocked.projectAttachmentFindFirst.mockResolvedValue({
      projectId: "project-1",
      projectPath: "/tmp/imported.luie",
    });
    mocked.projectFindUnique.mockResolvedValue({
      id: "project-1",
      title: "Imported",
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

  it("falls back to legacy projectPath search when no attachment row exists", async () => {
    mocked.projectAttachmentFindFirst.mockResolvedValue(null);
    mocked.projectFindFirst.mockResolvedValue({
      id: "project-2",
      title: "Legacy Imported",
      projectPath: "/tmp/legacy-imported.luie",
      updatedAt: new Date("2026-03-10T00:00:00.000Z"),
    });

    await expect(
      findProjectByAttachmentPath("/tmp/legacy-imported.luie"),
    ).resolves.toMatchObject({
      id: "project-2",
      title: "Legacy Imported",
      projectPath: "/tmp/legacy-imported.luie",
    });
  });

  it("migrates valid legacy project paths into attachment rows and skips invalid ones", async () => {
    mocked.projectFindMany.mockResolvedValue([
      {
        id: "project-1",
        projectPath: "/tmp/project-1.luie",
        updatedAt: new Date("2026-03-12T00:00:00.000Z"),
      },
      {
        id: "project-2",
        projectPath: "relative/unsafe-project-2.luie",
        updatedAt: new Date("2026-03-11T00:00:00.000Z"),
      },
    ]);
    mocked.projectAttachmentFindMany.mockResolvedValue([]);
    mocked.projectAttachmentUpsert.mockResolvedValue({
      projectId: "project-1",
      projectPath: "/tmp/project-1.luie",
    });
    mocked.projectUpdate.mockResolvedValue({
      id: "project-1",
    });

    await expect(
      migrateLegacyProjectAttachments(),
    ).resolves.toMatchObject({
      migratedRecords: 1,
      clearedLegacyRecords: 1,
      skippedInvalidRecords: 1,
    });

    expect(mocked.projectAttachmentUpsert).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      create: {
        projectId: "project-1",
        projectPath: "/tmp/project-1.luie",
      },
      update: {
        projectPath: "/tmp/project-1.luie",
      },
    });
    expect(mocked.projectUpdate).toHaveBeenCalledTimes(1);
    expect(mocked.projectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: { projectPath: null },
    });
  });
});
