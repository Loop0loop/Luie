import { BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import {
  LUIE_PACKAGE_EXTENSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
} from "../../../shared/constants/index.js";
import { IPC_CHANNELS } from "../../../shared/ipc/channels.js";
import { createLogger } from "../../../shared/logger/index.js";
import type {
  SyncEntityBaseline,
  SyncPendingProjectDelete,
  SyncRunResult,
  SyncSettings,
  SyncStatus,
} from "../../../shared/types/index.js";
import type { LuiePackageExportData } from "../io/luiePackageTypes.js";
import { db } from "../../database/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import { readLuieEntry } from "../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../utils/pathValidation.js";
import {
  isRecord,
  normalizeWorldScrapPayload,
  parseWorldJsonSafely,
  toWorldUpdatedAt,
} from "../../../shared/world/worldDocumentCodec.js";
import { syncAuthService } from "./syncAuthService.js";
import {
  buildProjectPackagePayload as buildProjectPackagePayloadImpl,
  persistBundleToLuiePackages,
  recoverDbCacheFromPersistedPackages,
} from "./sync/syncPackagePersistence.js";
import {
  applyChapterTombstones,
  applyProjectDeletes,
  collectDeletedProjectIds,
  upsertChapter,
  upsertCharacters,
  upsertProjects,
  upsertTerms,
} from "./sync/syncLocalApply.js";
import {
  createEmptySyncBundle,
  mergeSyncBundles,
  type SyncBundle,
} from "./syncMapper.js";
import { syncRepository } from "./syncRepository.js";

const logger = createLogger("SyncService");

const AUTO_SYNC_DEBOUNCE_MS = 1500;

const INITIAL_STATUS: SyncStatus = {
  connected: false,
  autoSync: true,
  mode: "idle",
  health: "disconnected",
  inFlight: false,
  queued: false,
  conflicts: {
    chapters: 0,
    memos: 0,
    total: 0,
    items: [],
  },
};

const toIsoString = (value: unknown, fallback = new Date().toISOString()): string => {
  if (typeof value === "string" && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
};

const toNullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toSyncErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.startsWith("SUPABASE_SCHEMA_MISSING:")) {
    const table = raw.split(":")[1] ?? "unknown";
    return `SYNC_REMOTE_SCHEMA_MISSING:${table}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project`;
  }
  return raw;
};

const AUTH_FATAL_ERROR_PATTERNS = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE",
];

const WORLD_DOCUMENT_FILES: Array<{
  docType: "synopsis" | "plot" | "drawing" | "mindmap" | "graph";
  fileName: string;
}> = [
  { docType: "synopsis", fileName: LUIE_WORLD_SYNOPSIS_FILE },
  { docType: "plot", fileName: LUIE_WORLD_PLOT_FILE },
  { docType: "drawing", fileName: LUIE_WORLD_DRAWING_FILE },
  { docType: "mindmap", fileName: LUIE_WORLD_MINDMAP_FILE },
  { docType: "graph", fileName: LUIE_WORLD_GRAPH_FILE },
];

type WorldDocumentType = SyncBundle["worldDocuments"][number]["docType"];
type SyncConflictResolutionInput = {
  type: "chapter" | "memo";
  id: string;
  resolution: "local" | "remote";
};

const WORLD_DOCUMENT_FILE_BY_TYPE: Record<WorldDocumentType, string> = {
  synopsis: LUIE_WORLD_SYNOPSIS_FILE,
  plot: LUIE_WORLD_PLOT_FILE,
  drawing: LUIE_WORLD_DRAWING_FILE,
  mindmap: LUIE_WORLD_MINDMAP_FILE,
  graph: LUIE_WORLD_GRAPH_FILE,
  scrap: LUIE_WORLD_SCRAP_MEMOS_FILE,
};

const WORLD_DOCUMENT_TYPES: WorldDocumentType[] = [
  "synopsis",
  "plot",
  "drawing",
  "mindmap",
  "graph",
  "scrap",
];

const isAuthFatalMessage = (message: string): boolean =>
  AUTH_FATAL_ERROR_PATTERNS.some((pattern) => message.includes(pattern));

const toSyncStatusFromSettings = (
  syncSettings: SyncSettings,
  baseStatus: SyncStatus,
): SyncStatus => ({
  ...baseStatus,
  connected: syncSettings.connected,
  provider: syncSettings.provider,
  email: syncSettings.email,
  userId: syncSettings.userId,
  expiresAt: syncSettings.expiresAt,
  autoSync: syncSettings.autoSync,
  lastSyncedAt: syncSettings.lastSyncedAt,
  lastError: syncSettings.lastError,
  projectLastSyncedAtByProjectId: syncSettings.projectLastSyncedAtByProjectId,
  health: syncSettings.connected
    ? baseStatus.health === "degraded"
      ? "degraded"
      : "connected"
    : "disconnected",
  degradedReason:
    syncSettings.connected && baseStatus.health === "degraded"
      ? baseStatus.degradedReason ?? syncSettings.lastError
      : undefined,
});

const normalizePendingProjectDeletes = (
  value: SyncSettings["pendingProjectDeletes"],
): SyncPendingProjectDelete[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is SyncPendingProjectDelete =>
      Boolean(
        entry &&
        typeof entry.projectId === "string" &&
        entry.projectId.length > 0 &&
        typeof entry.deletedAt === "string" &&
        entry.deletedAt.length > 0,
      ),
    )
    .map((entry) => ({
      projectId: entry.projectId,
      deletedAt: entry.deletedAt,
    }));
};

export class SyncService {
  private status: SyncStatus = INITIAL_STATUS;
  private inFlightPromise: Promise<SyncRunResult> | null = null;
  private queuedRun = false;
  private autoSyncTimer: NodeJS.Timeout | null = null;

  private toSyncedProjectStates(
    syncMap: Record<string, string> | undefined,
  ): SyncStatus["projectStateById"] {
    if (!syncMap) return undefined;
    const entries = Object.entries(syncMap);
    if (entries.length === 0) return undefined;
    return Object.fromEntries(
      entries.map(([projectId, lastSyncedAt]) => [
        projectId,
        {
          state: "synced" as const,
          lastSyncedAt,
        },
      ]),
    );
  }

  private withConflictProjectStates(
    base: SyncStatus["projectStateById"],
    conflicts: SyncStatus["conflicts"],
  ): SyncStatus["projectStateById"] {
    const next = { ...(base ?? {}) };
    for (const item of conflicts.items ?? []) {
      next[item.projectId] = {
        state: "pending",
        lastSyncedAt: next[item.projectId]?.lastSyncedAt,
        reason: "SYNC_CONFLICT_DETECTED",
      };
    }
    return Object.keys(next).length > 0 ? next : undefined;
  }

  private withErrorProjectStates(
    base: SyncStatus["projectStateById"],
    reason: string,
  ): SyncStatus["projectStateById"] {
    if (!base) return base;
    const next = Object.fromEntries(
      Object.entries(base).map(([projectId, state]) => [
        projectId,
        {
          state: "error" as const,
          lastSyncedAt: state.lastSyncedAt,
          reason,
        },
      ]),
    );
    return Object.keys(next).length > 0 ? next : undefined;
  }

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
      projectStateById: this.withErrorProjectStates(this.status.projectStateById, message),
      lastRun: lastRun ?? this.status.lastRun,
    });
  }

  private buildProjectSyncMapForSuccess(
    syncSettings: SyncSettings,
    merged: SyncBundle,
    syncedAt: string,
    pendingProjectDeleteIds: string[],
  ): Record<string, string> | undefined {
    const next = {
      ...(syncSettings.projectLastSyncedAtByProjectId ?? {}),
    };

    for (const projectId of pendingProjectDeleteIds) {
      delete next[projectId];
    }

    for (const project of merged.projects) {
      if (project.deletedAt) {
        delete next[project.id];
        continue;
      }
      next[project.id] = syncedAt;
    }

    for (const tombstone of merged.tombstones) {
      if (tombstone.entityType !== "project") continue;
      delete next[tombstone.entityId];
      delete next[tombstone.projectId];
    }

    return Object.keys(next).length > 0 ? next : undefined;
  }

  private buildEntityBaselineMapForSuccess(
    syncSettings: SyncSettings,
    merged: SyncBundle,
    syncedAt: string,
    pendingProjectDeleteIds: string[],
  ): Record<string, SyncEntityBaseline> | undefined {
    const next: Record<string, SyncEntityBaseline> = {
      ...(syncSettings.entityBaselinesByProjectId ?? {}),
    };
    this.dropEntityBaselines(next, pendingProjectDeleteIds);

    const deletedProjectIds = this.collectDeletedProjectIdsForBaselines(merged);
    this.dropEntityBaselines(next, Array.from(deletedProjectIds));

    const activeProjectIds = this.seedActiveProjectBaselines(
      next,
      merged,
      deletedProjectIds,
      syncedAt,
    );
    this.applyChapterBaselines(next, merged, deletedProjectIds, activeProjectIds, syncedAt);
    this.applyMemoBaselines(next, merged, deletedProjectIds, activeProjectIds, syncedAt);

    return Object.keys(next).length > 0 ? next : undefined;
  }

  private collectDeletedProjectIdsForBaselines(merged: SyncBundle): Set<string> {
    const deletedProjectIds = new Set<string>();
    for (const project of merged.projects) {
      if (project.deletedAt) deletedProjectIds.add(project.id);
    }
    for (const tombstone of merged.tombstones) {
      if (tombstone.entityType !== "project") continue;
      deletedProjectIds.add(tombstone.entityId);
      deletedProjectIds.add(tombstone.projectId);
    }
    return deletedProjectIds;
  }

  private dropEntityBaselines(
    baselines: Record<string, SyncEntityBaseline>,
    projectIds: string[],
  ): void {
    for (const projectId of projectIds) {
      delete baselines[projectId];
    }
  }

  private seedActiveProjectBaselines(
    baselines: Record<string, SyncEntityBaseline>,
    merged: SyncBundle,
    deletedProjectIds: Set<string>,
    syncedAt: string,
  ): Set<string> {
    const activeProjectIds = new Set<string>();
    for (const project of merged.projects) {
      if (project.deletedAt || deletedProjectIds.has(project.id)) continue;
      activeProjectIds.add(project.id);
      baselines[project.id] = {
        chapter: {},
        memo: {},
        capturedAt: syncedAt,
      };
    }
    return activeProjectIds;
  }

  private applyChapterBaselines(
    baselines: Record<string, SyncEntityBaseline>,
    merged: SyncBundle,
    deletedProjectIds: Set<string>,
    activeProjectIds: Set<string>,
    syncedAt: string,
  ): void {
    for (const chapter of merged.chapters) {
      if (chapter.deletedAt || deletedProjectIds.has(chapter.projectId)) continue;
      if (!activeProjectIds.has(chapter.projectId)) continue;
      const baseline = baselines[chapter.projectId];
      if (!baseline) continue;
      baseline.chapter[chapter.id] = chapter.updatedAt;
      baseline.capturedAt = syncedAt;
    }
  }

  private applyMemoBaselines(
    baselines: Record<string, SyncEntityBaseline>,
    merged: SyncBundle,
    deletedProjectIds: Set<string>,
    activeProjectIds: Set<string>,
    syncedAt: string,
  ): void {
    for (const memo of merged.memos) {
      if (memo.deletedAt || deletedProjectIds.has(memo.projectId)) continue;
      if (!activeProjectIds.has(memo.projectId)) continue;
      const baseline = baselines[memo.projectId];
      if (!baseline) continue;
      baseline.memo[memo.id] = memo.updatedAt;
      baseline.capturedAt = syncedAt;
    }
  }

  private persistMigratedTokenCipher(
    tokenType: "access" | "refresh",
    migratedCipher?: string,
  ): void {
    if (!migratedCipher) return;
    settingsManager.setSyncSettings(
      tokenType === "access"
        ? { accessTokenCipher: migratedCipher }
        : { refreshTokenCipher: migratedCipher },
    );
  }

  private resolveStartupAuthFailure(syncSettings: SyncSettings): string | null {
    const accessTokenResult = syncAuthService.getAccessToken(syncSettings);
    if (accessTokenResult.errorCode && isAuthFatalMessage(accessTokenResult.errorCode)) {
      return accessTokenResult.errorCode;
    }
    this.persistMigratedTokenCipher("access", accessTokenResult.migratedCipher);

    const refreshTokenResult = syncAuthService.getRefreshToken(syncSettings);
    if (refreshTokenResult.errorCode && isAuthFatalMessage(refreshTokenResult.errorCode)) {
      return refreshTokenResult.errorCode;
    }
    this.persistMigratedTokenCipher("refresh", refreshTokenResult.migratedCipher);

    const hasRecoverableTokenPath =
      Boolean(accessTokenResult.token) || Boolean(refreshTokenResult.token);
    if (hasRecoverableTokenPath) return null;

    return (
      accessTokenResult.errorCode ??
      refreshTokenResult.errorCode ??
      "SYNC_ACCESS_TOKEN_UNAVAILABLE"
    );
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
      const fatalAuthError = this.resolveStartupAuthFailure(syncSettings);
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
    this.updateStatus({
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
      const pendingProjectDeleteIds = normalizePendingProjectDeletes(
        syncSettings.pendingProjectDeletes,
      ).map((entry) => entry.projectId);

      const accessToken = await this.ensureAccessToken(syncSettings);
      const [remoteBundle, localBundle] = await Promise.all([
        syncRepository.fetchBundle(accessToken, userId),
        this.buildLocalBundle(userId),
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
          pulled: this.countBundleRows(remoteBundle),
          pushed: 0,
          conflicts: conflicts.total,
          success: false,
          message: "SYNC_CONFLICT_DETECTED",
        } as const;
        this.updateStatus({
          ...toSyncStatusFromSettings(settingsManager.getSyncSettings(), this.status),
          mode: "idle",
          health: "connected",
          degradedReason: undefined,
          inFlight: false,
          queued: false,
          conflicts,
          projectStateById: this.withConflictProjectStates(
            this.toSyncedProjectStates(syncSettings.projectLastSyncedAtByProjectId),
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

      await this.applyMergedBundleToLocal(merged);
      await syncRepository.upsertBundle(accessToken, merged);

      const syncedAt = new Date().toISOString();
      const projectLastSyncedAtByProjectId = this.buildProjectSyncMapForSuccess(
        syncSettings,
        merged,
        syncedAt,
        pendingProjectDeleteIds,
      );
      const entityBaselinesByProjectId = this.buildEntityBaselineMapForSuccess(
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
        message: `SYNC_OK:${reason}`,
        pulled: this.countBundleRows(remoteBundle),
        pushed: this.countBundleRows(merged),
        conflicts,
        syncedAt,
      };

      this.updateStatus({
        ...toSyncStatusFromSettings(nextSettings, this.status),
        mode: "idle",
        health: "connected",
        degradedReason: undefined,
        inFlight: false,
        conflicts,
        projectStateById: this.toSyncedProjectStates(projectLastSyncedAtByProjectId),
        lastRun: {
          at: syncedAt,
          pulled: result.pulled,
          pushed: result.pushed,
          conflicts: result.conflicts.total,
          success: true,
          message: result.message,
        },
      });

      if (this.queuedRun) {
        this.queuedRun = false;
        void this.runNow("queued");
      }

      return result;
    } catch (error) {
      const message = toSyncErrorMessage(error);
      const failureAt = new Date().toISOString();
      const failureRun = {
        at: failureAt,
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts.total,
        success: false,
        message,
      } as const;
      if (isAuthFatalMessage(message)) {
        this.applyAuthFailureState(message, failureRun);
      } else {
        const nextSettings = settingsManager.setSyncSettings({
          lastError: message,
        });
        this.updateStatus({
          ...toSyncStatusFromSettings(nextSettings, this.status),
          mode: "error",
          health: this.status.connected ? "connected" : "disconnected",
          degradedReason: undefined,
          inFlight: false,
          queued: false,
          projectStateById: this.withErrorProjectStates(this.status.projectStateById, message),
          lastRun: failureRun,
        });
      }
      this.queuedRun = false;

      logger.error("Sync run failed", { error, reason });
      return {
        success: false,
        message,
        pulled: 0,
        pushed: 0,
        conflicts: this.status.conflicts,
      };
    }
  }

  private async ensureAccessToken(syncSettings: SyncSettings): Promise<string> {
    const maybePersistMigratedToken = (migratedCipher?: string) => {
      if (!migratedCipher) return;
      settingsManager.setSyncSettings({
        accessTokenCipher: migratedCipher,
      });
    };

    const expiresSoon = syncSettings.expiresAt
      ? Date.parse(syncSettings.expiresAt) <= Date.now() + 60_000
      : true;
    const accessTokenResult = syncAuthService.getAccessToken(syncSettings);
    if (accessTokenResult.errorCode && isAuthFatalMessage(accessTokenResult.errorCode)) {
      throw new Error(accessTokenResult.errorCode);
    }
    maybePersistMigratedToken(accessTokenResult.migratedCipher);
    let token = accessTokenResult.token;

    if (expiresSoon || !token) {
      const refreshTokenResult = syncAuthService.getRefreshToken(syncSettings);
      if (refreshTokenResult.errorCode && isAuthFatalMessage(refreshTokenResult.errorCode)) {
        throw new Error(refreshTokenResult.errorCode);
      }
      if (refreshTokenResult.migratedCipher) {
        settingsManager.setSyncSettings({
          refreshTokenCipher: refreshTokenResult.migratedCipher,
        });
      }
      if (!refreshTokenResult.token) {
        throw new Error("SYNC_AUTH_REFRESH_UNAVAILABLE");
      }

      const refreshed = await syncAuthService.refreshSession(syncSettings);
      const nextSettings = settingsManager.setSyncSettings({
        provider: refreshed.provider,
        userId: refreshed.userId,
        email: refreshed.email,
        expiresAt: refreshed.expiresAt,
        accessTokenCipher: refreshed.accessTokenCipher,
        refreshTokenCipher: refreshed.refreshTokenCipher,
      });
      const refreshedToken = syncAuthService.getAccessToken(nextSettings);
      if (refreshedToken.errorCode && isAuthFatalMessage(refreshedToken.errorCode)) {
        throw new Error(refreshedToken.errorCode);
      }
      maybePersistMigratedToken(refreshedToken.migratedCipher);
      token = refreshedToken.token;
    }

    if (!token) {
      throw new Error("SYNC_ACCESS_TOKEN_UNAVAILABLE");
    }
    return token;
  }

  private async buildLocalBundle(userId: string): Promise<SyncBundle> {
    const bundle = createEmptySyncBundle();
    const prisma = db.getClient();
    const pendingProjectDeletes = normalizePendingProjectDeletes(
      settingsManager.getSyncSettings().pendingProjectDeletes,
    );
    const projectRows = (await prisma.project.findMany({
      include: {
        chapters: true,
        characters: true,
        terms: true,
      },
    })) as Array<Record<string, unknown>>;

    for (const projectRow of projectRows) {
      await this.collectProjectBundleData(bundle, userId, projectRow);
    }
    this.appendPendingProjectDeleteTombstones(bundle, userId, pendingProjectDeletes);

    return bundle;
  }

  private async collectProjectBundleData(
    bundle: SyncBundle,
    userId: string,
    projectRow: Record<string, unknown>,
  ): Promise<void> {
    const project = this.appendProjectRecord(bundle, userId, projectRow);
    if (!project) return;
    const { projectId, projectPath, projectUpdatedAt } = project;

    this.appendChapterRecords(
      bundle,
      userId,
      projectId,
      Array.isArray(projectRow.chapters)
        ? (projectRow.chapters as Array<Record<string, unknown>>)
        : [],
    );
    this.appendCharacterRecords(
      bundle,
      userId,
      projectId,
      Array.isArray(projectRow.characters)
        ? (projectRow.characters as Array<Record<string, unknown>>)
        : [],
    );
    this.appendTermRecords(
      bundle,
      userId,
      projectId,
      Array.isArray(projectRow.terms)
        ? (projectRow.terms as Array<Record<string, unknown>>)
        : [],
    );

    if (projectPath && projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      try {
        const safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
        await this.collectWorldDocuments(
          bundle,
          userId,
          projectId,
          safeProjectPath,
          projectUpdatedAt,
        );
      } catch (error) {
        logger.warn("Skipping sync world document read for invalid projectPath", {
          projectId,
          projectPath,
          error,
        });
      }
    }
  }

  private appendProjectRecord(
    bundle: SyncBundle,
    userId: string,
    projectRow: Record<string, unknown>,
  ): { projectId: string; projectPath: string | null; projectUpdatedAt: string } | null {
    const projectId = toNullableString(projectRow.id);
    if (!projectId) return null;
    const projectUpdatedAt = toIsoString(projectRow.updatedAt);

    bundle.projects.push({
      id: projectId,
      userId,
      title: toNullableString(projectRow.title) ?? "Untitled",
      description: toNullableString(projectRow.description),
      createdAt: toIsoString(projectRow.createdAt),
      updatedAt: projectUpdatedAt,
    });

    return {
      projectId,
      projectPath: toNullableString(projectRow.projectPath),
      projectUpdatedAt,
    };
  }

  private appendChapterRecords(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    chapters: Array<Record<string, unknown>>,
  ): void {
    for (const row of chapters) {
      const chapterId = toNullableString(row.id);
      if (!chapterId) continue;
      const chapterDeletedAt = toNullableString(row.deletedAt);
      bundle.chapters.push({
        id: chapterId,
        userId,
        projectId,
        title: toNullableString(row.title) ?? "Untitled",
        content: toNullableString(row.content) ?? "",
        synopsis: toNullableString(row.synopsis),
        order: toNumber(row.order),
        wordCount: toNumber(row.wordCount),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        deletedAt: chapterDeletedAt,
      });

      if (!chapterDeletedAt) continue;
      bundle.tombstones.push({
        id: `${projectId}:chapter:${chapterId}`,
        userId,
        projectId,
        entityType: "chapter",
        entityId: chapterId,
        deletedAt: chapterDeletedAt,
        updatedAt: chapterDeletedAt,
      });
    }
  }

  private appendCharacterRecords(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    characters: Array<Record<string, unknown>>,
  ): void {
    for (const row of characters) {
      const characterId = toNullableString(row.id);
      if (!characterId) continue;
      bundle.characters.push({
        id: characterId,
        userId,
        projectId,
        name: toNullableString(row.name) ?? "Character",
        description: toNullableString(row.description),
        firstAppearance: toNullableString(row.firstAppearance),
        attributes: toNullableString(row.attributes),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
      });
    }
  }

  private appendTermRecords(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    terms: Array<Record<string, unknown>>,
  ): void {
    for (const row of terms) {
      const termId = toNullableString(row.id);
      if (!termId) continue;
      bundle.terms.push({
        id: termId,
        userId,
        projectId,
        term: toNullableString(row.term) ?? "Term",
        definition: toNullableString(row.definition),
        category: toNullableString(row.category),
        order: toNumber(row.order),
        firstAppearance: toNullableString(row.firstAppearance),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
      });
    }
  }

  private appendPendingProjectDeleteTombstones(
    bundle: SyncBundle,
    userId: string,
    pendingProjectDeletes: SyncPendingProjectDelete[],
  ): void {
    for (const pendingDelete of pendingProjectDeletes) {
      bundle.tombstones.push({
        id: `${pendingDelete.projectId}:project:${pendingDelete.projectId}`,
        userId,
        projectId: pendingDelete.projectId,
        entityType: "project",
        entityId: pendingDelete.projectId,
        deletedAt: pendingDelete.deletedAt,
        updatedAt: pendingDelete.deletedAt,
      });
    }
  }

  private addWorldDocumentRecord(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    docType: SyncBundle["worldDocuments"][number]["docType"],
    payload: unknown,
    updatedAtFallback: string,
  ): void {
    bundle.worldDocuments.push({
      id: `${projectId}:${docType}`,
      userId,
      projectId,
      docType,
      payload,
      updatedAt: toWorldUpdatedAt(payload) ?? updatedAtFallback,
    });
  }

  private async readWorldDocumentPayload(
    projectPath: string,
    docType: WorldDocumentType,
  ): Promise<unknown | null> {
    const fileName = WORLD_DOCUMENT_FILE_BY_TYPE[docType];
    const entryPath = `${LUIE_WORLD_DIR}/${fileName}`;
    let raw: string | null = null;
    try {
      raw = await readLuieEntry(projectPath, entryPath, logger);
    } catch (error) {
      logger.warn("Failed to read .luie world document for sync; skipping doc", {
        projectPath,
        entryPath,
        docType,
        error,
      });
      return null;
    }

    if (raw === null) {
      return null;
    }

    const parsed = parseWorldJsonSafely(raw);
    if (parsed === null) {
      logger.warn("Failed to parse .luie world document for sync; skipping doc", {
        projectPath,
        entryPath,
        docType,
      });
      return null;
    }

    return parsed;
  }

  private appendScrapMemos(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    payload: unknown,
    updatedAtFallback: string,
  ): void {
    const normalizedScrap = normalizeWorldScrapPayload(payload);
    for (const memo of normalizedScrap.memos) {
      bundle.memos.push({
        id: memo.id || randomUUID(),
        userId,
        projectId,
        title: memo.title || "Memo",
        content: memo.content,
        tags: memo.tags,
        updatedAt: memo.updatedAt || updatedAtFallback,
      });
    }
  }

  private async collectWorldDocuments(
    bundle: SyncBundle,
    userId: string,
    projectId: string,
    projectPath: string,
    updatedAtFallback: string,
  ): Promise<void> {
    for (const descriptor of WORLD_DOCUMENT_FILES) {
      const payload = await this.readWorldDocumentPayload(projectPath, descriptor.docType);
      if (!payload) continue;
      this.addWorldDocumentRecord(
        bundle,
        userId,
        projectId,
        descriptor.docType,
        payload,
        updatedAtFallback,
      );
    }

    const scrapPayload = await this.readWorldDocumentPayload(projectPath, "scrap");
    if (!isRecord(scrapPayload)) return;

    this.addWorldDocumentRecord(
      bundle,
      userId,
      projectId,
      "scrap",
      scrapPayload,
      updatedAtFallback,
    );
    this.appendScrapMemos(bundle, userId, projectId, scrapPayload, updatedAtFallback);
  }

  private async hydrateMissingWorldDocsFromPackage(
    worldDocs: Map<WorldDocumentType, unknown>,
    projectPath: string,
  ): Promise<void> {
    const missingDocTypes = WORLD_DOCUMENT_TYPES.filter((docType) => !worldDocs.has(docType));
    if (missingDocTypes.length === 0) return;

    await Promise.all(
      missingDocTypes.map(async (docType) => {
        const payload = await this.readWorldDocumentPayload(projectPath, docType);
        if (payload !== null) {
          worldDocs.set(docType, payload);
        }
      }),
    );
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
  ): Promise<LuiePackageExportData | null> {
    return buildProjectPackagePayloadImpl({
      bundle,
      projectId,
      projectPath,
      localSnapshots,
      hydrateMissingWorldDocsFromPackage: (worldDocs, targetProjectPath) =>
        this.hydrateMissingWorldDocsFromPackage(worldDocs, targetProjectPath),
      logger,
    });
  }

  private async applyMergedBundleToLocal(bundle: SyncBundle): Promise<void> {
    // `.luie` package is the source of truth. Persist it first so DB cache
    // mutations do not commit when package write fails.
    const persistedPackages = await persistBundleToLuiePackages({
      bundle,
      hydrateMissingWorldDocsFromPackage: (worldDocs, projectPath) =>
        this.hydrateMissingWorldDocsFromPackage(worldDocs, projectPath),
      buildProjectPackagePayload: (args) =>
        this.buildProjectPackagePayload(
          args.bundle,
          args.projectId,
          args.projectPath,
          args.localSnapshots,
        ),
      logger,
    });

    const prisma = db.getClient();
    const deletedProjectIds = collectDeletedProjectIds(bundle);
    try {
      await prisma.$transaction(async (tx: unknown) => {
        const transactionClient = tx as ReturnType<(typeof db)["getClient"]>;
        await applyProjectDeletes(transactionClient, deletedProjectIds);
        await upsertProjects(transactionClient, bundle.projects, deletedProjectIds);

        for (const chapter of bundle.chapters) {
          if (deletedProjectIds.has(chapter.projectId)) continue;
          await upsertChapter(transactionClient, chapter);
        }

        await upsertCharacters(transactionClient, bundle.characters, deletedProjectIds);
        await upsertTerms(transactionClient, bundle.terms, deletedProjectIds);
        await applyChapterTombstones(
          transactionClient,
          bundle.tombstones,
          deletedProjectIds,
        );
      });
    } catch (error) {
      const persistedProjectIds = persistedPackages.map((item) => item.projectId);
      logger.error("Failed to apply merged bundle to DB cache after .luie persistence", {
        error,
        persistedProjectIds,
      });

      const failedRecoveryProjectIds = await recoverDbCacheFromPersistedPackages(
        persistedPackages,
        logger,
      );
      if (failedRecoveryProjectIds.length > 0) {
        throw new Error(
          `SYNC_DB_CACHE_APPLY_FAILED:${persistedProjectIds.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${failedRecoveryProjectIds.join(",")}`,
        );
      }
      throw new Error(`SYNC_DB_CACHE_APPLY_FAILED:${persistedProjectIds.join(",") || "none"}`);
    }
  }

  private countBundleRows(bundle: SyncBundle): number {
    return (
      bundle.projects.length +
      bundle.chapters.length +
      bundle.characters.length +
      bundle.terms.length +
      bundle.worldDocuments.length +
      bundle.memos.length +
      bundle.snapshots.length +
      bundle.tombstones.length
    );
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
