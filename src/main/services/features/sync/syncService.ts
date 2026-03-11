import { BrowserWindow } from "electron";
import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import { createLogger } from "../../../../shared/logger/index.js";
import type {
  SyncRunResult,
  SyncSettings,
  SyncStatus,
} from "../../../../shared/types/index.js";
import { settingsManager } from "../../../manager/settingsManager.js";
import { syncAuthService } from "./syncAuthService.js";
import type { SyncBundle } from "./syncMapper.js";
import {
  hydrateMissingWorldDocsFromPackage,
} from "./syncBundleCollector.js";
import {
  withErrorProjectStates,
} from "./syncStatusMachine.js";
import { ensureSyncAccessToken } from "./syncAccessToken.js";
import {
  applyMergedBundleToLocalFirstLuie,
} from "./syncBundleApplier.js";
import { executeSyncRun } from "./syncRunExecutor.js";
import { resolveStartupAuthFailure as resolveStartupAuthFailureImpl } from "./syncAuthStatus.js";
import {
  buildLocalBundleFromDatabase,
  buildProjectPackagePayloadForSync,
  countBundleRows,
} from "./syncBundleHelpers.js";
import {
  AUTO_SYNC_DEBOUNCE_MS,
  INITIAL_STATUS,
  isAuthFatalMessage,
  normalizePendingProjectDeletes,
  toSyncErrorMessage,
  toSyncStatusFromSettings,
  type SyncConflictResolutionInput,
} from "./syncStatusHelpers.js";

const logger = createLogger("SyncService");

export class SyncService {
  private status: SyncStatus = INITIAL_STATUS;
  private inFlightPromise: Promise<SyncRunResult> | null = null;
  private queuedRun = false;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  private applyAuthFailureState(message: string, lastRun?: SyncStatus["lastRun"]): void {
    const next = settingsManager.setSyncSettings({
      lastError: message,
    });
    this.updateStatus({
      ...toSyncStatusFromSettings(next, this.status),
      mode: "error",
      health: "degraded",
      degradedReason: message,
      inFlight: false,
      queued: false,
      projectStateById: withErrorProjectStates(this.status.projectStateById, message),
      lastRun: lastRun ?? this.status.lastRun,
    });
  }

  initialize(): void {
    const syncSettings = settingsManager.getSyncSettings();
    this.status = toSyncStatusFromSettings(syncSettings, this.status);

    if (!syncSettings.connected && syncAuthService.hasPendingAuthFlow()) {
      this.status = {
        ...this.status,
        mode: "connecting",
      };
    }

    if (syncSettings.connected) {
      const fatalAuthError = resolveStartupAuthFailureImpl(
        syncSettings,
        isAuthFatalMessage,
      );
      if (fatalAuthError) this.applyAuthFailureState(fatalAuthError);
    }

    this.broadcastStatus();

    if (this.status.connected && this.status.autoSync) {
      void this.runNow("startup");
    }
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  async connectGoogle(): Promise<SyncStatus> {
    if (this.status.mode === "connecting") {
      return this.status;
    }

    if (!syncAuthService.isConfigured()) {
      const message =
        "Supabase runtime configuration is not completed. Open Startup Wizard or sync settings and set Supabase URL/Anon Key.";
      this.updateStatus({
        mode: "error",
        health: "disconnected",
        degradedReason: undefined,
        lastError: message,
      });
      return this.status;
    }

    this.updateStatus({
      mode: "connecting",
      health: "disconnected",
      degradedReason: undefined,
      lastError: undefined,
    });

    try {
      await syncAuthService.startGoogleAuth();
      return this.status;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("SYNC_AUTH_FLOW_IN_PROGRESS")) {
        this.updateStatus({
          mode: "connecting",
          health: "disconnected",
          degradedReason: undefined,
          lastError: undefined,
        });
        return this.status;
      }
      this.updateStatus({
        mode: "error",
        health: "disconnected",
        degradedReason: undefined,
        lastError: message,
      });
      return this.status;
    }
  }

  async getEdgeAccessToken(): Promise<string> {
    const syncSettings = settingsManager.getSyncSettings();
    if (!syncSettings.connected || !syncSettings.userId) {
      throw new Error("SYNC_AUTH_REQUIRED_FOR_EDGE");
    }
    return this.ensureAccessToken(syncSettings);
  }

  async handleOAuthCallback(callbackUrl: string): Promise<void> {
    try {
      const session = await syncAuthService.completeOAuthCallback(callbackUrl);
      const current = settingsManager.getSyncSettings();
      const next = settingsManager.setSyncSettings({
        ...current,
        connected: true,
        provider: session.provider,
        userId: session.userId,
        email: session.email,
        expiresAt: session.expiresAt,
        accessTokenCipher: session.accessTokenCipher,
        refreshTokenCipher: session.refreshTokenCipher,
        lastError: undefined,
      });

      this.updateStatus({
        ...toSyncStatusFromSettings(next, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: undefined,
      });
      void this.runNow("oauth-callback");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus({
        mode: "error",
        lastError: message,
      });
      throw error;
    }
  }

  async disconnect(): Promise<SyncStatus> {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    this.queuedRun = false;
    const cleared = settingsManager.clearSyncSettings();
    this.updateStatus({
      ...toSyncStatusFromSettings(cleared, INITIAL_STATUS),
      mode: "idle",
      health: "disconnected",
      degradedReason: undefined,
      queued: false,
      inFlight: false,
      conflicts: {
        chapters: 0,
        memos: 0,
        total: 0,
        items: [],
      },
      projectStateById: undefined,
    });
    return this.status;
  }

  async setAutoSync(enabled: boolean): Promise<SyncStatus> {
    const next = settingsManager.setSyncSettings({ autoSync: enabled });
    this.updateStatus(toSyncStatusFromSettings(next, this.status));
    return this.status;
  }

  async resolveConflict(input: SyncConflictResolutionInput): Promise<void> {
    logger.info("Sync conflict resolution requested", {
      type: input.type,
      id: input.id,
      resolution: input.resolution,
    });
    const conflictItems = this.status.conflicts.items ?? [];
    const conflictExists = conflictItems.some(
      (item) => item.type === input.type && item.id === input.id,
    );
    if (!conflictExists) {
      throw new Error("SYNC_CONFLICT_NOT_FOUND");
    }

    const syncSettings = settingsManager.getSyncSettings();
    const pendingConflictResolutions = {
      ...(syncSettings.pendingConflictResolutions ?? {}),
      [`${input.type}:${input.id}`]: input.resolution,
    };
    settingsManager.setSyncSettings({
      pendingConflictResolutions,
      lastError: undefined,
    });

    const runResult = await this.runNow(
      `resolve-conflict:${input.type}:${input.id}:${input.resolution}`,
    );
    if (!runResult.success && runResult.message !== "SYNC_CONFLICT_DETECTED") {
      throw new Error(runResult.message || "SYNC_RESOLVE_CONFLICT_FAILED");
    }
  }

  onLocalMutation(_reason?: string): void {
    if (!this.status.connected || !this.status.autoSync) {
      return;
    }
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      this.autoSyncTimer = null;
      void this.runNow("auto");
    }, AUTO_SYNC_DEBOUNCE_MS);
  }

  async runNow(reason = "manual"): Promise<SyncRunResult> {
    if (!this.status.connected) {
      return {
        success: false,
        message: "SYNC_NOT_CONNECTED",
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts,
      };
    }

    if (this.inFlightPromise) {
      this.queuedRun = true;
      this.updateStatus({ queued: true });
      return this.inFlightPromise;
    }

    const runPromise = this.executeRun(reason)
      .finally(() => {
        this.inFlightPromise = null;
      });

    this.inFlightPromise = runPromise;
    return runPromise;
  }

  private async executeRun(reason: string): Promise<SyncRunResult> {
    return await executeSyncRun({
      reason,
      getStatus: () => this.status,
      getQueuedRun: () => this.queuedRun,
      setQueuedRun: (next) => {
        this.queuedRun = next;
      },
      runQueuedSync: () => {
        void this.runNow("queued");
      },
      normalizePendingProjectDeletes,
      toSyncStatusFromSettings,
      ensureAccessToken: async (syncSettings) => await this.ensureAccessToken(syncSettings),
      buildLocalBundle: async (userId) => await this.buildLocalBundle(userId),
      applyMergedBundleToLocal: async (bundle) => await this.applyMergedBundleToLocal(bundle),
      countBundleRows: (bundle) => this.countBundleRows(bundle),
      updateStatus: (next) => this.updateStatus(next),
      applyAuthFailureState: (message, lastRun) =>
        this.applyAuthFailureState(message, lastRun),
      isAuthFatalMessage,
      toSyncErrorMessage,
      logRunFailed: (error, failedReason) => {
        logger.error("Sync run failed", { error, reason: failedReason });
      },
    });
  }

  private async ensureAccessToken(syncSettings: SyncSettings): Promise<string> {
    return await ensureSyncAccessToken({
      syncSettings,
      isAuthFatalMessage,
    });
  }

  private async buildLocalBundle(userId: string): Promise<SyncBundle> {
    return await buildLocalBundleFromDatabase({
      logger,
      pendingProjectDeletes: normalizePendingProjectDeletes(
        settingsManager.getSyncSettings().pendingProjectDeletes,
      ),
      userId,
    });
  }

  private async buildProjectPackagePayload(
    bundle: SyncBundle,
    projectId: string,
    projectPath: string,
    localSnapshots: Array<{
      id: string;
      chapterId: string | null;
      content: string;
      description: string | null;
      createdAt: Date;
    }>,
  ) {
    return await buildProjectPackagePayloadForSync({
      bundle,
      localSnapshots,
      logger,
      projectId,
      projectPath,
    });
  }

  private async applyMergedBundleToLocal(bundle: SyncBundle): Promise<void> {
    await applyMergedBundleToLocalFirstLuie({
      bundle,
      hydrateMissingWorldDocsFromPackage: async (worldDocs, projectPath) =>
        await hydrateMissingWorldDocsFromPackage(worldDocs, projectPath, logger),
      buildProjectPackagePayload: async (args) =>
        await this.buildProjectPackagePayload(
          args.bundle,
          args.projectId,
          args.projectPath,
          args.localSnapshots,
        ),
      logger,
    });
  }

  private countBundleRows(bundle: SyncBundle): number {
    return countBundleRows(bundle);
  }

  private updateStatus(next: Partial<SyncStatus>): void {
    this.status = {
      ...this.status,
      ...next,
    };
    this.broadcastStatus();
  }

  private broadcastStatus(): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (win.isDestroyed()) continue;
      try {
        win.webContents.send(IPC_CHANNELS.SYNC_STATUS_CHANGED, this.status);
      } catch (error) {
        logger.warn("Failed to broadcast sync status", { error });
      }
    }
  }
}

export const syncService = new SyncService();
