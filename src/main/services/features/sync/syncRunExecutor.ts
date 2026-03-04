import { settingsManager } from "../../../manager/settingsManager.js";
import type {
  SyncPendingProjectDelete,
  SyncRunResult,
  SyncSettings,
  SyncStatus,
} from "../../../../shared/types/index.js";
import {
  mergeSyncBundles,
  type SyncBundle,
} from "./syncMapper.js";
import { syncRepository } from "./syncRepository.js";
import {
  buildEntityBaselineMapForSuccess,
  buildProjectSyncMapForSuccess,
  toSyncedProjectStates,
  withConflictProjectStates,
  withErrorProjectStates,
} from "./syncStatusMachine.js";

type RunExecutorDeps = {
  reason: string;
  getStatus: () => SyncStatus;
  getQueuedRun: () => boolean;
  setQueuedRun: (next: boolean) => void;
  runQueuedSync: () => void;
  normalizePendingProjectDeletes: (
    value: SyncSettings["pendingProjectDeletes"],
  ) => SyncPendingProjectDelete[];
  toSyncStatusFromSettings: (
    syncSettings: SyncSettings,
    baseStatus: SyncStatus,
  ) => SyncStatus;
  ensureAccessToken: (syncSettings: SyncSettings) => Promise<string>;
  buildLocalBundle: (userId: string) => Promise<SyncBundle>;
  applyMergedBundleToLocal: (bundle: SyncBundle) => Promise<void>;
  countBundleRows: (bundle: SyncBundle) => number;
  updateStatus: (next: Partial<SyncStatus>) => void;
  applyAuthFailureState: (message: string, lastRun?: SyncStatus["lastRun"]) => void;
  isAuthFatalMessage: (message: string) => boolean;
  toSyncErrorMessage: (error: unknown) => string;
  logRunFailed: (error: unknown, reason: string) => void;
};

export const executeSyncRun = async (deps: RunExecutorDeps): Promise<SyncRunResult> => {
  deps.updateStatus({
    mode: "syncing",
    inFlight: true,
    queued: false,
    lastError: undefined,
  });

  try {
    const syncSettings = settingsManager.getSyncSettings();
    const userId = syncSettings.userId;
    if (!userId) {
      throw new Error("SYNC_USER_ID_MISSING");
    }
    const pendingProjectDeleteIds = deps
      .normalizePendingProjectDeletes(syncSettings.pendingProjectDeletes)
      .map((entry) => entry.projectId);

    const accessToken = await deps.ensureAccessToken(syncSettings);
    const [remoteBundle, localBundle] = await Promise.all([
      syncRepository.fetchBundle(accessToken, userId),
      deps.buildLocalBundle(userId),
    ]);

    const { merged, conflicts } = mergeSyncBundles(localBundle, remoteBundle, {
      baselinesByProjectId: syncSettings.entityBaselinesByProjectId,
      conflictResolutions: syncSettings.pendingConflictResolutions,
    });

    if (conflicts.total > 0) {
      const unresolvedKeys = new Set(
        (conflicts.items ?? []).map((item) => `${item.type}:${item.id}`),
      );
      const nextResolutionMap = Object.fromEntries(
        Object.entries(syncSettings.pendingConflictResolutions ?? {}).filter((entry) =>
          unresolvedKeys.has(entry[0]),
        ),
      );
      settingsManager.setSyncSettings({
        pendingConflictResolutions:
          Object.keys(nextResolutionMap).length > 0 ? nextResolutionMap : undefined,
        lastError: undefined,
      });
      const lastRunAt = new Date().toISOString();
      const lastRun = {
        at: lastRunAt,
        pulled: deps.countBundleRows(remoteBundle),
        pushed: 0,
        conflicts: conflicts.total,
        success: false,
        message: "SYNC_CONFLICT_DETECTED",
      } as const;
      deps.updateStatus({
        ...deps.toSyncStatusFromSettings(settingsManager.getSyncSettings(), deps.getStatus()),
        mode: "idle",
        health: "connected",
        degradedReason: undefined,
        inFlight: false,
        queued: false,
        conflicts,
        projectStateById: withConflictProjectStates(
          toSyncedProjectStates(syncSettings.projectLastSyncedAtByProjectId),
          conflicts,
        ),
        lastRun,
      });
      return {
        success: false,
        message: "SYNC_CONFLICT_DETECTED",
        pulled: lastRun.pulled,
        pushed: 0,
        conflicts,
      };
    }

    await deps.applyMergedBundleToLocal(merged);
    await syncRepository.upsertBundle(accessToken, merged);

    const syncedAt = new Date().toISOString();
    const projectLastSyncedAtByProjectId = buildProjectSyncMapForSuccess(
      syncSettings,
      merged,
      syncedAt,
      pendingProjectDeleteIds,
    );
    const entityBaselinesByProjectId = buildEntityBaselineMapForSuccess(
      syncSettings,
      merged,
      syncedAt,
      pendingProjectDeleteIds,
    );
    const nextSettings = settingsManager.setSyncSettings({
      lastSyncedAt: syncedAt,
      lastError: undefined,
      projectLastSyncedAtByProjectId,
      entityBaselinesByProjectId,
      pendingConflictResolutions: undefined,
    });
    if (pendingProjectDeleteIds.length > 0) {
      settingsManager.removePendingProjectDeletes(pendingProjectDeleteIds);
    }

    const result: SyncRunResult = {
      success: true,
      message: `SYNC_OK:${deps.reason}`,
      pulled: deps.countBundleRows(remoteBundle),
      pushed: deps.countBundleRows(merged),
      conflicts,
      syncedAt,
    };

    deps.updateStatus({
      ...deps.toSyncStatusFromSettings(nextSettings, deps.getStatus()),
      mode: "idle",
      health: "connected",
      degradedReason: undefined,
      inFlight: false,
      conflicts,
      projectStateById: toSyncedProjectStates(projectLastSyncedAtByProjectId),
      lastRun: {
        at: syncedAt,
        pulled: result.pulled,
        pushed: result.pushed,
        conflicts: result.conflicts.total,
        success: true,
        message: result.message,
      },
    });

    if (deps.getQueuedRun()) {
      deps.setQueuedRun(false);
      deps.runQueuedSync();
    }

    return result;
  } catch (error) {
    const message = deps.toSyncErrorMessage(error);
    const failureAt = new Date().toISOString();
    const failureRun = {
      at: failureAt,
      pulled: 0,
      pushed: 0,
      conflicts: deps.getStatus().conflicts.total,
      success: false,
      message,
    } as const;
    if (deps.isAuthFatalMessage(message)) {
      deps.applyAuthFailureState(message, failureRun);
    } else {
      const nextSettings = settingsManager.setSyncSettings({
        lastError: message,
      });
      deps.updateStatus({
        ...deps.toSyncStatusFromSettings(nextSettings, deps.getStatus()),
        mode: "error",
        health: deps.getStatus().connected ? "connected" : "disconnected",
        degradedReason: undefined,
        inFlight: false,
        queued: false,
        projectStateById: withErrorProjectStates(deps.getStatus().projectStateById, message),
        lastRun: failureRun,
      });
    }
    deps.setQueuedRun(false);

    deps.logRunFailed(error, deps.reason);
    return {
      success: false,
      message,
      pulled: 0,
      pushed: 0,
      conflicts: deps.getStatus().conflicts,
    };
  }
};
