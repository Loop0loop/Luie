import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  calls: [] as string[],
  transaction: vi.fn((callback: (tx: unknown) => unknown) => {
    return callback({});
  }),
  persistBundleToLuiePackages: vi.fn(async () => {
    mocked.calls.push("package");
    return [];
  }),
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
    persistBundleToLuiePackages: mocked.persistBundleToLuiePackages,
  }),
);

vi.mock("../../../src/main/services/features/sync/syncLocalApply.js", () => ({
  applyChapterTombstones: vi.fn(),
  applyReplicaWorldState: vi.fn(() => mocked.calls.push("world apply")),
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

const applyBundle = async (bundle = createBundle()) => {
  await applyMergedBundleToLocalFirstLuie({
    bundle,
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
    mocked.transaction.mockImplementation((callback: (tx: unknown) => unknown) => {
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
    });
    mocked.persistBundleToLuiePackages.mockImplementation(async () => {
      mocked.calls.push("package");
      return [];
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
    expect(mocked.persistBundleToLuiePackages).toHaveBeenCalledTimes(1);
    expect(mocked.persistBundleToLuiePackages).toHaveBeenCalledWith(
      expect.objectContaining({
        capturedRevisions: new Map([["project-1", 7]]),
      }),
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
    expect(mocked.persistBundleToLuiePackages).not.toHaveBeenCalled();
  });
});
