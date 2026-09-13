import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  recover: vi.fn(async () => undefined),
  search: vi.fn(async () => ({ queued: 0, processed: 0, failed: 0 })),
  listProjects: vi.fn(async () => [] as string[]),
  longPending: vi.fn(async () => ({
    searchLongPendingCount: 0,
    memoryLongPendingCount: 0,
  })),
}));

vi.mock("../../../src/main/services/features/dbMaintenance/index.js", () => ({
  dbMaintenanceService: {
    recoverStaleRunningJobs: mocked.recover,
    processPendingSearchJobs: mocked.search,
    listProjectsWithPendingMemoryJobs: mocked.listProjects,
    getLongPendingStats: mocked.longPending,
  },
}));
vi.mock("../../../src/main/infra/database/index.js", () => ({
  db: { getClient: vi.fn() },
  memoryBuildJob: {},
}));
vi.mock("../../../src/main/manager/autoSave/index.js", () => ({
  autoSaveManager: { getPendingSaveCount: () => 0 },
}));
vi.mock(
  "../../../src/main/services/features/memory/memoryProjectionService.js",
  () => ({ memoryProjectionService: {} }),
);
vi.mock(
  "../../../src/main/services/features/memory/chapterSummaryProjector.js",
  () => ({ chapterSummaryProjector: {} }),
);
vi.mock(
  "../../../src/main/services/features/memory/embeddingProjector.js",
  () => ({ embeddingProjector: {} }),
);
vi.mock(
  "../../../src/main/services/features/memory/episode/memoryEpisodeExtractionProcessor.js",
  () => ({
    listProjectsWithPendingEpisodeExtractionJobs: async () => [],
    processPendingLlmEpisodeExtractionJobs: vi.fn(),
  }),
);
vi.mock(
  "../../../src/main/services/features/memory/temporal/memoryTemporalFactExtractionRunner.js",
  () => ({
    listProjectsWithPendingTemporalFactEvidence: async () => [],
    processPendingLlmTemporalFactExtraction: vi.fn(),
  }),
);
vi.mock(
  "../../../src/main/services/features/memory/summary/memoryNarrativeSummaryRunner.js",
  () => ({ generateProjectNarrativeSummaryHierarchy: vi.fn() }),
);
vi.mock(
  "../../../src/main/services/features/memory/summary/memoryNarrativeSummaryDrift.js",
  () => ({ refreshStaleProjectNarrativeSummaries: vi.fn() }),
);
vi.mock(
  "../../../src/main/services/features/memory/summary/memoryNarrativeSummaryScheduler.js",
  () => ({
    scheduleProjectNarrativeCommunities: vi.fn(),
    scheduleProjectNarrativeHierarchyScopes: vi.fn(),
  }),
);

import { derivedJobWorker } from "../../../src/main/services/features/derivedJobs/derivedJobWorker.js";
import { requestDerivedJobWakeup } from "../../../src/main/services/features/derivedJobs/derivedJobWakeup.js";

describe("derived job worker idle wake-up", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await derivedJobWorker.stop();
    vi.useRealTimers();
  });

  it("backs off for five seconds while idle and runs immediately on enqueue signal", async () => {
    derivedJobWorker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.search).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(4_999);
    expect(mocked.search).toHaveBeenCalledTimes(1);

    requestDerivedJobWakeup();
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.search).toHaveBeenCalledTimes(2);
  });
});
