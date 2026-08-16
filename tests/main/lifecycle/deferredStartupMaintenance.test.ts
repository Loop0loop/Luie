import { afterEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  ensureBootstrapReady: vi.fn(async () => ({ isReady: true })),
  flushMirrors: vi.fn(async () => undefined),
  pruneSnapshots: vi.fn(async () => undefined),
  cleanupOrphans: vi.fn(async () => undefined),
  reconcilePaths: vi.fn(async () => undefined),
  scheduleExports: vi.fn(async () => 0),
  cleanupRelations: vi.fn(async () => undefined),
  purgeRows: vi.fn(async () => undefined),
  purgeEmbeddings: vi.fn(async () => undefined),
}));

vi.mock("../../../src/main/domains/project/index.js", () => ({
  projectService: {
    reconcileProjectPathDuplicates: mocked.reconcilePaths,
    scheduleStalePackageExports: mocked.scheduleExports,
  },
}));
vi.mock("../../../src/main/domains/recovery/index.js", () => ({
  snapshotService: {
    pruneSnapshotsAllProjects: mocked.pruneSnapshots,
    cleanupOrphanArtifacts: mocked.cleanupOrphans,
  },
}));
vi.mock("../../../src/main/lifecycle/bootstrap/index.js", () => ({
  ensureBootstrapReady: mocked.ensureBootstrapReady,
}));
vi.mock("../../../src/main/domains/manuscript/index.js", () => ({
  autoSaveManager: { flushMirrorsToSnapshots: mocked.flushMirrors },
}));
vi.mock("../../../src/main/domains/world/index.js", () => ({
  entityRelationService: {
    cleanupOrphanRelationsAcrossProjects: mocked.cleanupRelations,
  },
}));
vi.mock("../../../src/main/services/features/dbMaintenance/index.js", () => ({
  dbMaintenanceService: {
    purgeOrphanDerivedRows: mocked.purgeRows,
    purgeInvalidEmbeddings: mocked.purgeEmbeddings,
  },
}));

describe("deferred startup maintenance shutdown", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not schedule new maintenance while shutdown is paused", async () => {
    vi.useFakeTimers();
    const {
      pauseDeferredStartupMaintenance,
      resumeDeferredStartupMaintenance,
      scheduleDeferredStartupMaintenance,
    } = await import(
      "../../../src/main/lifecycle/app-ready/deferredStartupMaintenance.js"
    );
    await pauseDeferredStartupMaintenance();
    scheduleDeferredStartupMaintenance(
      { info: vi.fn() } as never,
      "renderer-ready-during-shutdown",
    );

    expect(vi.getTimerCount()).toBe(0);
    resumeDeferredStartupMaintenance();
    expect(vi.getTimerCount()).toBe(1);
    vi.clearAllTimers();
  });

  it("waits for every snapshot task when one sibling fails", async () => {
    vi.useFakeTimers();
    mocked.pruneSnapshots.mockRejectedValueOnce(new Error("prune failed"));
    let finishCleanup: (() => void) | undefined;
    mocked.cleanupOrphans.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishCleanup = resolve;
        }),
    );
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never;
    const {
      pauseDeferredStartupMaintenance,
      scheduleDeferredStartupMaintenance,
    } = await import(
      "../../../src/main/lifecycle/app-ready/deferredStartupMaintenance.js"
    );

    scheduleDeferredStartupMaintenance(logger, "test");
    await vi.advanceTimersByTimeAsync(1500);
    let pauseSettled = false;
    const pause = pauseDeferredStartupMaintenance().then(() => {
      pauseSettled = true;
    });
    await vi.advanceTimersByTimeAsync(0);

    expect(pauseSettled).toBe(false);
    finishCleanup?.();
    await pause;
    expect(pauseSettled).toBe(true);
  });
});
