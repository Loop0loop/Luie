// TEST_LEVEL: UNIT_MOCKED
// PROVES: snapshot service 분기, fallback 처리, mock persistence policy
// DOES_NOT_PROVE: 실제 filesystem durability 또는 end-to-end .luie persistence

import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMixedNarrativeText } from "../luieFixtures.js";

const mocked = vi.hoisted(() => ({
  initialize: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
  snapshotCreate: vi.fn(),
  snapshotFindUnique: vi.fn(),
  snapshotFindMany: vi.fn(),
  snapshotDelete: vi.fn(),
  chapterUpdate: vi.fn(),
  projectUpdate: vi.fn(),
  projectFindMany: vi.fn(),
  chapterBodyWrite: vi.fn(),
  transaction: vi.fn((callback: (client: unknown) => unknown) => callback({})),
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

const makeWriteChain = (handler: ReturnType<typeof vi.fn>) => ({
  set: vi.fn((value) => {
    handler(value);
    return { where: vi.fn(() => ({ run: vi.fn() })) };
  }),
  where: vi.fn(() => ({ run: vi.fn(() => handler()) })),
});

const makeTransactionClient = () => ({
  insert: vi.fn(() => ({
    values: vi.fn((value) => {
      mocked.chapterBodyWrite(value);
      return { onConflictDoUpdate: vi.fn(() => ({ run: vi.fn() })) };
    }),
  })),
  update: vi.fn(() => ({
    set: vi.fn((value) => {
      mocked.projectUpdate(value);
      mocked.chapterUpdate(value);
      return { where: vi.fn(() => ({ run: vi.fn() })) };
    }),
  })),
  delete: vi.fn(() => makeWriteChain(mocked.snapshotDelete)),
});

const makeMockClient = () => ({
  insert: vi.fn(() => ({
    values: vi.fn((value) => ({
      returning: vi.fn(async () => [await mocked.snapshotCreate(value)]),
    })),
  })),
  select: vi.fn((selection?: unknown) => ({
    from: vi.fn((_table: string) => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => {
          const row = await mocked.snapshotFindUnique();
          return row ? [row] : [];
        }),
        orderBy: vi.fn(async () => await mocked.snapshotFindMany(selection)),
      })),
      orderBy: vi.fn(async () => await mocked.projectFindMany()),
    })),
  })),
  update: vi.fn(() => makeWriteChain(mocked.projectUpdate)),
  delete: vi.fn(() => makeWriteChain(mocked.snapshotDelete)),
  transaction: mocked.transaction,
});

vi.mock("../../../src/main/database/index.js", () => ({
  chapter: "Chapter",
  chapterBody: "ChapterBody",
  project: "Project",
  snapshot: "Snapshot",
  db: {
    initialize: mocked.initialize,
    disconnect: mocked.disconnect,
    getClient: () => makeMockClient(),
  },
}));

vi.mock(
  "../../../src/main/services/features/project/projectService.js",
  () => ({
    projectService: {
      persistPackageAfterMutation: (projectId: string, reason: string) =>
        mocked.persistPackageAfterMutation(projectId, reason),
    },
  }),
);

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

describe("SnapshotService package behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.transaction.mockImplementation(
      (callback: (client: unknown) => unknown) =>
        callback(makeTransactionClient()),
    );
    mocked.snapshotCreate.mockResolvedValue({
      id: "snapshot-1",
      projectId: "project-1",
      chapterId: "chapter-1",
      content: "hello",
      createdAt: new Date("2026-03-12T00:00:00.000Z"),
    });
    mocked.snapshotDelete.mockResolvedValue({ id: "snapshot-1" });
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

  it("requests .luie persistence after snapshot creation", async () => {
    const service = new SnapshotService();

    const created = await service.createSnapshot({
      projectId: "project-1",
      chapterId: "chapter-1",
      content: "hello",
      description: "snapshot",
    });

    expect(created).toMatchObject({ id: "snapshot-1" });
    expect(mocked.projectUpdate).toHaveBeenCalledWith({
      updatedAt: expect.any(String),
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

  it("requests .luie persistence after snapshot restore and pruning", async () => {
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
      updatedAt: expect.any(String),
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

  it.each([5_000, 100_000, 1_000_000, 2_000_000, 5_000_000])(
    "routes %i-character snapshot bodies through package persistence",
    async (length) => {
      const service = new SnapshotService();
      const content = makeMixedNarrativeText(length, 0);

      const created = await service.createSnapshot({
        projectId: "project-1",
        chapterId: "chapter-1",
        content,
        description: `snapshot-${length}`,
      });

      expect(created).toMatchObject({ id: "snapshot-1" });
      expect(mocked.snapshotCreate).toHaveBeenCalledWith(
        expect.objectContaining({ content }),
      );
      expect(mocked.persistPackageAfterMutation).toHaveBeenCalledWith(
        "project-1",
        "snapshot:create",
      );
    },
  );
});
