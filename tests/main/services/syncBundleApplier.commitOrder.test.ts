import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  calls: [] as string[],
  transaction: vi.fn((callback: (tx: unknown) => unknown) => {
    return callback({});
  }),
  exportProjectPackageNow: vi.fn(async () => {
    mocked.calls.push("package");
    return true;
  }),
  schedulePackageExport: vi.fn(),
}));

vi.mock("../../../src/main/infra/database/index.js", () => ({
  db: {
    getClient: () => ({
      transaction: mocked.transaction,
    }),
  },
  project: { id: "project.id", revision: "project.revision" },
}));

vi.mock(
  "../../../src/main/services/features/sync/syncPackagePersistence.js",
  () => ({
    buildProjectPackagePayload: vi.fn(),
  }),
);

vi.mock(
  "../../../src/main/services/features/project/projectService.js",
  () => ({
    projectService: {
      exportProjectPackageNow: mocked.exportProjectPackageNow,
      schedulePackageExport: mocked.schedulePackageExport,
    },
  }),
);

vi.mock("../../../src/main/services/features/sync/syncLocalApply.js", () => ({
  applyChapterTombstones: vi.fn(),
  applyReplicaWorldDelta: vi.fn(() => mocked.calls.push("world apply")),
  applyProjectDeletes: vi.fn(),
  collectDeletedProjectIds: vi.fn(() => new Set<string>()),
  upsertChapter: vi.fn(),
  upsertCharacters: vi.fn(),
  upsertEvents: vi.fn(),
  upsertFactions: vi.fn(),
  upsertProjects: vi.fn(() => mocked.calls.push("db apply")),
  upsertTerms: vi.fn(),
}));

vi.mock(
  "../../../src/main/services/features/sync/syncMemoryCanonicalApply.js",
  () => ({
    applyMemoryCanonicalSyncRows: vi.fn(() =>
      mocked.calls.push("memory apply"),
    ),
  }),
);

import { applyMergedBundleToLocalFirstLuie } from "../../../src/main/services/features/sync/syncBundleApplier.js";
import type { SyncBundle } from "../../../src/main/services/features/sync/syncMapper.js";

const createBundle = (): SyncBundle => ({
  projects: [
    {
      id: "project-1",
      title: "Project",
      description: null,
      content: null,
      status: "active",
      projectPath: "/tmp/project.luie",
      createdAt: new Date("2026-06-30T00:00:00.000Z"),
      updatedAt: new Date("2026-06-30T00:00:00.000Z"),
      lastOpenedAt: null,
      syncVersion: 1,
      deletedAt: null,
      vectorClock: "{}",
    },
  ],
  chapters: [],
  characters: [],
  events: [],
  factions: [],
  terms: [],
  worldDocuments: [],
  memos: [],
  snapshots: [],
  tombstones: [],
});

const applyBundle = async (
  bundle = createBundle(),
  packageBundle?: SyncBundle,
) => {
  await applyMergedBundleToLocalFirstLuie({
    bundle,
    packageBundle,
    hydrateMissingWorldDocsFromPackage: vi.fn(),
    buildProjectPackagePayload: vi.fn(async () => null),
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
};

describe("applyMergedBundleToLocalFirstLuie", () => {
  beforeEach(() => {
    mocked.calls.length = 0;
    vi.clearAllMocks();
    mocked.transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) => {
        const tx = {
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                all: vi.fn(() => {
                  mocked.calls.push("revision capture");
                  return [{ id: "project-1", revision: 7 }];
                }),
              })),
            })),
          })),
        };
        return callback(tx);
      },
    );
    mocked.exportProjectPackageNow.mockImplementation(async () => {
      mocked.calls.push("package");
      return true;
    });
  });

  it("persists .luie packages after the DB transaction succeeds", async () => {
    await applyBundle();

    expect(mocked.calls).toEqual([
      "db apply",
      "world apply",
      "memory apply",
      "revision capture",
      "package",
    ]);
    expect(mocked.exportProjectPackageNow).toHaveBeenCalledWith(
      "project-1",
      "sync",
    );
  });

  it("does not persist .luie packages when the DB transaction fails", async () => {
    mocked.transaction.mockImplementationOnce(() => {
      mocked.calls.push("db apply");
      throw new Error("db failed");
    });

    await expect(applyBundle()).rejects.toThrow(
      "SYNC_DB_CACHE_APPLY_FAILED:project-1",
    );
    expect(mocked.calls).toEqual(["db apply"]);
    expect(mocked.exportProjectPackageNow).not.toHaveBeenCalled();
  });

  it("queues a retry when the authoritative package export fails", async () => {
    mocked.exportProjectPackageNow.mockResolvedValueOnce(false);

    await expect(applyBundle()).rejects.toThrow(
      "SYNC_LUIE_PERSIST_FAILED:project-1",
    );
    expect(mocked.schedulePackageExport).toHaveBeenCalledWith(
      "project-1",
      "sync:retry",
    );
  });

  it("applies only the delta and exports the affected project from DB", async () => {
    const packageBundle = createBundle();
    packageBundle.chapters = [
      {
        id: "chapter-1",
        userId: "user-1",
        projectId: "project-1",
        title: "Changed",
        content: "changed",
        order: 0,
        wordCount: 1,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:01:00.000Z",
      },
      {
        id: "chapter-2",
        userId: "user-1",
        projectId: "project-1",
        title: "Unchanged",
        content: "must remain in the package",
        order: 1,
        wordCount: 5,
        createdAt: "2026-06-30T00:00:00.000Z",
        updatedAt: "2026-06-30T00:00:00.000Z",
      },
    ];
    const delta = {
      ...createBundle(),
      projects: [],
      chapters: [packageBundle.chapters[0]!],
    };

    await applyBundle(delta, packageBundle);

    expect(mocked.exportProjectPackageNow).toHaveBeenCalledWith(
      "project-1",
      "sync",
    );
  });
});
