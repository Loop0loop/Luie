// TEST_LEVEL: COMPONENT_INTEGRATION
// PROVES: a stale local snapshot is rebuilt before a same-chapter remote delta can be applied

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SyncSettings,
  SyncStatus,
} from "../../../src/shared/types/index.js";
import {
  createEmptySyncBundle,
  type SyncBundle,
} from "../../../src/main/services/features/sync/syncMapper.js";

const mocked = vi.hoisted(() => ({
  getSyncSettings: vi.fn(),
  setSyncSettings: vi.fn(),
  fetchBundle: vi.fn(),
  upsertBundle: vi.fn(),
}));

vi.mock("../../../src/main/domains/settings/index.js", () => ({
  settingsManager: {
    getSyncSettings: mocked.getSyncSettings,
    setSyncSettings: mocked.setSyncSettings,
    removePendingProjectDeletes: vi.fn(),
  },
}));

vi.mock("../../../src/main/services/features/sync/syncRepository.js", () => ({
  syncRepository: {
    fetchBundle: mocked.fetchBundle,
    upsertBundle: mocked.upsertBundle,
  },
}));

import { executeSyncRun } from "../../../src/main/services/features/sync/syncRunExecutor.js";

const USER_ID = "00000000-0000-0000-0000-000000000001";
const PROJECT_ID = "project-1";
const CHAPTER_ID = "chapter-1";
const BASELINE_AT = "2026-09-14T00:00:00.000Z";

const buildBundle = (content: string, updatedAt: string): SyncBundle => {
  const bundle = createEmptySyncBundle();
  bundle.projects.push({
    id: PROJECT_ID,
    userId: USER_ID,
    title: "Project",
    createdAt: BASELINE_AT,
    updatedAt,
  });
  bundle.chapters.push({
    id: CHAPTER_ID,
    userId: USER_ID,
    projectId: PROJECT_ID,
    title: "Chapter",
    content,
    order: 0,
    wordCount: 1,
    createdAt: BASELINE_AT,
    updatedAt,
  });
  return bundle;
};

const countRows = (bundle: SyncBundle): number =>
  bundle.projects.length + bundle.chapters.length;

describe("executeSyncRun concurrent chapter protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const settings: SyncSettings = {
      connected: true,
      autoSync: false,
      userId: USER_ID,
      entityBaselinesByProjectId: {
        [PROJECT_ID]: {
          chapter: { [CHAPTER_ID]: BASELINE_AT },
          memo: {},
          capturedAt: BASELINE_AT,
        },
      },
    };
    mocked.getSyncSettings.mockImplementation(() => ({ ...settings }));
    mocked.setSyncSettings.mockImplementation(
      (patch: Partial<SyncSettings>) => {
        Object.assign(settings, patch);
        return { ...settings };
      },
    );
  });

  it("remerges local B with remote C after apply rejects snapshot A", async () => {
    const localA = buildBundle("A", BASELINE_AT);
    const localB = buildBundle("B", "2026-09-14T00:01:00.000Z");
    const remoteC = buildBundle("C", "2026-09-14T00:02:00.000Z");
    const buildLocalBundle = vi
      .fn<() => Promise<SyncBundle>>()
      .mockResolvedValueOnce(localA)
      .mockResolvedValueOnce(localB);
    const applyMergedBundleToLocal = vi.fn().mockResolvedValueOnce({
      status: "local-changed",
      chapterIds: [CHAPTER_ID],
    });
    mocked.fetchBundle.mockResolvedValue(remoteC);
    let status: SyncStatus = {
      connected: true,
      autoSync: false,
      userId: USER_ID,
      mode: "idle",
      health: "connected",
      inFlight: false,
      queued: false,
      conflicts: { chapters: 0, memos: 0, memoryCanonical: 0, total: 0 },
    };

    const result = await executeSyncRun({
      reason: "manual",
      getStatus: () => status,
      getQueuedRun: () => false,
      setQueuedRun: vi.fn(),
      runQueuedSync: vi.fn(),
      normalizePendingProjectDeletes: () => [],
      toSyncStatusFromSettings: (_settings, base) => base,
      ensureAccessToken: async () => "access-token",
      buildLocalBundle: async () => await buildLocalBundle(),
      applyMergedBundleToLocal,
      countBundleRows: countRows,
      updateStatus: (next) => {
        status = { ...status, ...next };
      },
      applyAuthFailureState: vi.fn(),
      isAuthFatalMessage: () => false,
      toSyncErrorMessage: (error) =>
        error instanceof Error ? error.message : String(error),
      logRunFailed: vi.fn(),
    });

    expect(result).toMatchObject({
      success: false,
      message: "SYNC_CONFLICT_DETECTED",
      conflicts: { chapters: 1, total: 1 },
    });
    expect(result.conflicts.items?.[0]).toMatchObject({
      type: "chapter",
      id: CHAPTER_ID,
      projectId: PROJECT_ID,
      localPreview: "B",
      remotePreview: "C",
    });
    expect(buildLocalBundle).toHaveBeenCalledTimes(2);
    expect(applyMergedBundleToLocal).toHaveBeenCalledTimes(1);
    expect(mocked.upsertBundle).not.toHaveBeenCalled();
    expect(mocked.setSyncSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({ lastSyncedAt: expect.any(String) }),
    );
  });

  it("stops after a second stale snapshot without applying or uploading", async () => {
    const localA = buildBundle("A", BASELINE_AT);
    const remoteC = buildBundle("C", "2026-09-14T00:02:00.000Z");
    const buildLocalBundle = vi.fn(async () => localA);
    const applyMergedBundleToLocal = vi.fn(async () => ({
      status: "local-changed" as const,
      chapterIds: [CHAPTER_ID],
    }));
    const logRunFailed = vi.fn();
    mocked.fetchBundle.mockResolvedValue(remoteC);
    let status: SyncStatus = {
      connected: true,
      autoSync: false,
      userId: USER_ID,
      mode: "idle",
      health: "connected",
      inFlight: false,
      queued: false,
      conflicts: { chapters: 0, memos: 0, memoryCanonical: 0, total: 0 },
    };

    const result = await executeSyncRun({
      reason: "manual",
      getStatus: () => status,
      getQueuedRun: () => false,
      setQueuedRun: vi.fn(),
      runQueuedSync: vi.fn(),
      normalizePendingProjectDeletes: () => [],
      toSyncStatusFromSettings: (_settings, base) => base,
      ensureAccessToken: async () => "access-token",
      buildLocalBundle,
      applyMergedBundleToLocal,
      countBundleRows: countRows,
      updateStatus: (next) => {
        status = { ...status, ...next };
      },
      applyAuthFailureState: vi.fn(),
      isAuthFatalMessage: () => false,
      toSyncErrorMessage: (error) =>
        error instanceof Error ? error.message : String(error),
      logRunFailed,
    });

    expect(result).toMatchObject({
      success: false,
      message: `SYNC_LOCAL_SNAPSHOT_STALE:${CHAPTER_ID}`,
    });
    expect(buildLocalBundle).toHaveBeenCalledTimes(2);
    expect(applyMergedBundleToLocal).toHaveBeenCalledTimes(2);
    expect(mocked.upsertBundle).not.toHaveBeenCalled();
    expect(logRunFailed).toHaveBeenCalledOnce();
  });
});
