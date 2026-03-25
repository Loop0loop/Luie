import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
  snapshotCreate: vi.fn(),
  snapshotFindUnique: vi.fn(),
  snapshotFindMany: vi.fn(),
  snapshotDelete: vi.fn(),
  snapshotDeleteMany: vi.fn(),
  snapshotFindFirst: vi.fn(),
  chapterUpdate: vi.fn(),
  projectUpdate: vi.fn(),
  projectFindMany: vi.fn(),
  transaction: vi.fn(async (callback: (client: unknown) => unknown) => {
    return await callback({
      snapshot: {
        create: mocked.snapshotCreate,
        findUnique: mocked.snapshotFindUnique,
        findMany: mocked.snapshotFindMany,
        delete: mocked.snapshotDelete,
        deleteMany: mocked.snapshotDeleteMany,
        findFirst: mocked.snapshotFindFirst,
      },
      chapter: {
        update: mocked.chapterUpdate,
      },
      project: {
        update: mocked.projectUpdate,
      },
    });
  }),
  writeFullSnapshotArtifact: vi.fn(async (..._args: unknown[]) => undefined),
  cleanupOrphanSnapshotArtifacts: vi.fn(async (..._args: unknown[]) => ({
    scanned: 0,
    deleted: 0,
  })),
  listSnapshotRestoreCandidates: vi.fn(
    async (..._args: unknown[]): Promise<unknown[]> => [],
  ),
  writeEmergencySnapshotFile: vi.fn(async (..._args: unknown[]) => undefined),
  importSnapshotFromFile: vi.fn(async (..._args: unknown[]) => ({
    id: "imported-snapshot",
  })),
  persistPackageAfterMutation: vi.fn(async (..._args: unknown[]) => undefined),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: mocked.initialize,
    disconnect: mocked.disconnect,
    getClient: () => ({
      snapshot: {
        create: mocked.snapshotCreate,
        findUnique: mocked.snapshotFindUnique,
        findMany: mocked.snapshotFindMany,
        delete: mocked.snapshotDelete,
        deleteMany: mocked.snapshotDeleteMany,
        findFirst: mocked.snapshotFindFirst,
      },
      chapter: {
        update: mocked.chapterUpdate,
      },
      project: {
        update: mocked.projectUpdate,
        findMany: mocked.projectFindMany,
      },
      $transaction: mocked.transaction,
    }),
  },
}));

vi.mock("../../../src/main/services/core/projectService.js", () => ({
  projectService: {
    persistPackageAfterMutation: (projectId: string, reason: string) =>
      mocked.persistPackageAfterMutation(projectId, reason),
  },
}));

vi.mock(
  "../../../src/main/services/features/snapshot/snapshotArtifacts.js",
  () => ({
    writeFullSnapshotArtifact: (...args: unknown[]) =>
      mocked.writeFullSnapshotArtifact(...args),
    cleanupOrphanSnapshotArtifacts: (...args: unknown[]) =>
      mocked.cleanupOrphanSnapshotArtifacts(...args),
    listSnapshotRestoreCandidates: (...args: unknown[]) =>
      mocked.listSnapshotRestoreCandidates(...args),
  }),
);

vi.mock(
  "../../../src/main/services/features/snapshot/snapshotEmergencyFile.js",
  () => ({
    writeEmergencySnapshotFile: (...args: unknown[]) =>
      mocked.writeEmergencySnapshotFile(...args),
  }),
);

vi.mock(
  "../../../src/main/services/features/snapshot/snapshotImportFromFile.js",
  () => ({
    importSnapshotFromFile: (...args: unknown[]) =>
      mocked.importSnapshotFromFile(...args),
  }),
);

import { SnapshotService } from "../../../src/main/services/features/snapshot/snapshotService.js";

describe("SnapshotService package durability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.snapshotCreate.mockResolvedValue({
      id: "snapshot-1",
      projectId: "project-1",
      chapterId: "chapter-1",
      content: "hello",
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
    });
    mocked.snapshotDelete.mockResolvedValue({ id: "snapshot-1" });
    mocked.snapshotDeleteMany.mockResolvedValue({ count: 1 });
    mocked.chapterUpdate.mockResolvedValue({ id: "chapter-1" });
    mocked.projectFindMany.mockResolvedValue([]);
    mocked.snapshotFindMany.mockResolvedValue([]);
    mocked.snapshotFindUnique.mockResolvedValue({
      id: "snapshot-1",
      projectId: "project-1",
      chapterId: "chapter-1",
      content: "restored content",
    });
  });

  it("attempts immediate .luie export after snapshot creation", async () => {
    const service = new SnapshotService();

    const created = await service.createSnapshot({
      projectId: "project-1",
      chapterId: "chapter-1",
      content: "hello",
      description: "snapshot",
    });

    expect(created).toMatchObject({ id: "snapshot-1" });
    expect(mocked.projectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: {
        updatedAt: expect.any(Date),
      },
    });
    expect(mocked.persistPackageAfterMutation).toHaveBeenCalledWith(
      "project-1",
      "snapshot:create",
    );
  });

  it("fails snapshot creation and writes an emergency file when canonical .luie export fails", async () => {
    mocked.persistPackageAfterMutation.mockRejectedValueOnce(
      new Error("disk failure"),
    );
    const service = new SnapshotService();

    await expect(
      service.createSnapshot({
        projectId: "project-1",
        chapterId: "chapter-1",
        content: "hello",
        description: "snapshot",
      }),
    ).rejects.toMatchObject({
      code: "SNP_9001",
    });
    expect(mocked.writeEmergencySnapshotFile).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        chapterId: "chapter-1",
        content: "hello",
      }),
      expect.any(Object),
      expect.any(Error),
    );
  });

  it("refreshes the attached .luie immediately after snapshot restore and pruning", async () => {
    mocked.snapshotFindMany.mockResolvedValue([
      {
        id: "snapshot-old-1",
        createdAt: new Date("2026-02-20T00:00:00.000Z"),
      },
      {
        id: "snapshot-old-2",
        createdAt: new Date("2026-02-20T01:00:00.000Z"),
      },
    ]);

    const service = new SnapshotService();

    await service.restoreSnapshot("snapshot-1");
    await service.pruneSnapshots("project-1");

    expect(mocked.projectUpdate).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: {
        updatedAt: expect.any(Date),
      },
    });
    expect(mocked.persistPackageAfterMutation).toHaveBeenCalledWith(
      "project-1",
      "snapshot:restore",
    );
    expect(mocked.persistPackageAfterMutation).toHaveBeenCalledWith(
      "project-1",
      "snapshot:prune",
    );
  });

  it("returns restore candidates with project and saved-time metadata", async () => {
    mocked.listSnapshotRestoreCandidates.mockResolvedValueOnce([
      {
        snapshotId: "snapshot-restore-1",
        projectId: "project-1",
        projectTitle: "Recovered Draft",
        chapterTitle: "Chapter 12",
        savedAt: "2026-03-13T10:15:00.000Z",
        excerpt: "Recovered paragraph preview",
        filePath: "/tmp/recovered.snap",
      },
    ]);

    const service = new SnapshotService();
    const candidates = await service.listRestoreCandidates();

    expect(candidates).toEqual([
      expect.objectContaining({
        projectTitle: "Recovered Draft",
        savedAt: "2026-03-13T10:15:00.000Z",
        filePath: "/tmp/recovered.snap",
      }),
    ]);
  });
});
