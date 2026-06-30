// TEST_LEVEL: UNIT_MOCKED
// PROVES: project package file deletion does not happen before durable DB deletion
// DOES_NOT_PROVE: real database cascade behavior or filesystem deletion

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const deleteProjectPackageFileIfRequested = vi.fn(async () => undefined);
  const getProjectAttachmentPath = vi.fn(async () => "/tmp/project.luie");
  const addPendingProjectDelete = vi.fn();
  const removePendingProjectDeletes = vi.fn();
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const deleteWhere = vi.fn(() => {
    throw new Error("derived purge failed");
  });
  const client = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ id: "project-1" }]),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
  };

  return {
    addPendingProjectDelete,
    client,
    deleteProjectPackageFileIfRequested,
    deleteWhere,
    getProjectAttachmentPath,
    logger,
    removePendingProjectDeletes,
  };
});

vi.mock("../../../src/main/infra/database/index.js", () => ({
  db: {
    getClient: vi.fn(() => mocked.client),
  },
  project: { id: "project.id" },
  memoryEmbedding: { projectId: "memoryEmbedding.projectId" },
  memoryChunk: { projectId: "memoryChunk.projectId" },
  memoryBuildJob: { projectId: "memoryBuildJob.projectId" },
  searchDirtyQueue: { projectId: "searchDirtyQueue.projectId" },
}));

vi.mock("../../../src/main/domains/settings/index.js", () => ({
  settingsManager: {
    addPendingProjectDelete: mocked.addPendingProjectDelete,
    removePendingProjectDeletes: mocked.removePendingProjectDeletes,
    getSyncSettings: vi.fn(() => ({})),
    setSyncSettings: vi.fn(),
  },
}));

vi.mock("../../../src/main/services/core/project/projectAttachmentStore.js", () => ({
  getProjectAttachmentPath: mocked.getProjectAttachmentPath,
}));

vi.mock("../../../src/main/services/core/project/projectDeletionPolicy.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/main/services/core/project/projectDeletionPolicy.js")
  >("../../../src/main/services/core/project/projectDeletionPolicy.js");
  return {
    ...actual,
    deleteProjectPackageFileIfRequested:
      mocked.deleteProjectPackageFileIfRequested,
  };
});

describe("deleteProjectRecord deletion order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not delete the package file when DB deletion fails before project row removal", async () => {
    const { deleteProjectRecord } = await import(
      "../../../src/main/services/core/project/projectRemoval.js"
    );

    await expect(
      deleteProjectRecord(
        { id: "project-1", deleteFile: true },
        mocked.logger,
      ),
    ).rejects.toThrow("Failed to delete project");

    expect(mocked.getProjectAttachmentPath).toHaveBeenCalledWith("project-1");
    expect(mocked.deleteProjectPackageFileIfRequested).not.toHaveBeenCalled();
  });
});
