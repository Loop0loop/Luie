import { BrowserWindow } from "electron";
import { randomUUID } from "node:crypto";
import {
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_MANUSCRIPT_DIR,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_VERSION,
  LUIE_WORLD_DIR,
  LUIE_WORLD_DRAWING_FILE,
  LUIE_WORLD_GRAPH_FILE,
  LUIE_WORLD_MINDMAP_FILE,
  LUIE_WORLD_PLOT_FILE,
  LUIE_WORLD_SCRAP_MEMOS_FILE,
  LUIE_WORLD_SYNOPSIS_FILE,
  MARKDOWN_EXTENSION,
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
import type { LuiePackageExportData } from "../../handler/system/ipcFsHandlers.js";
import { writeLuiePackage } from "../../handler/system/ipcFsHandlers.js";
import { db } from "../../database/index.js";
import { settingsManager } from "../../manager/settingsManager.js";
import { readLuieEntry } from "../../utils/luiePackage.js";
import { ensureSafeAbsolutePath } from "../../utils/pathValidation.js";
import { projectService } from "../core/projectService.js";
import {
  isRecord,
  normalizeWorldDrawingPaths,
  normalizeWorldMindmapEdges,
  normalizeWorldMindmapNodes,
  normalizeWorldScrapPayload,
  parseWorldJsonSafely,
  toWorldDrawingIcon,
  toWorldDrawingTool,
  toWorldUpdatedAt,
} from "../../../shared/world/worldDocumentCodec.js";
import { syncAuthService } from "./syncAuthService.js";
import {
  createEmptySyncBundle,
  mergeSyncBundles,
  type SyncBundle,
  type SyncChapterRecord,
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

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(rows: T[]): T[] =>
  [...rows].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));

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
type PersistedLuiePackage = { projectId: string; projectPath: string };
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

const WORLD_SYNOPSIS_STATUS = new Set(["draft", "working", "locked"]);

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
        "Supabase env is not configured (SUPABASE_URL/SUPABASE_ANON_KEY or SUPADATABASE_PRJ_ID/SUPADATABASE_API)";
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

  private decodeWorldDocumentPayload(
    projectId: string,
    docType: WorldDocumentType,
    payload: unknown,
  ): unknown {
    if (typeof payload !== "string") {
      return payload;
    }
    const parsed = parseWorldJsonSafely(payload);
    if (parsed !== null) {
      return parsed;
    }
    logger.warn("Invalid sync world document payload string; using default payload", {
      projectId,
      docType,
    });
    return null;
  }

  private normalizeSynopsisPayload(projectId: string, payload: unknown): Record<string, unknown> {
    const decoded = this.decodeWorldDocumentPayload(projectId, "synopsis", payload);
    if (!isRecord(decoded)) {
      return { synopsis: "", status: "draft" };
    }

    const statusValue = decoded.status;
    const status =
      typeof statusValue === "string" && WORLD_SYNOPSIS_STATUS.has(statusValue)
        ? statusValue
        : "draft";

    const normalized: Record<string, unknown> = {
      synopsis: typeof decoded.synopsis === "string" ? decoded.synopsis : "",
      status,
    };

    if (typeof decoded.genre === "string") normalized.genre = decoded.genre;
    if (typeof decoded.targetAudience === "string") {
      normalized.targetAudience = decoded.targetAudience;
    }
    if (typeof decoded.logline === "string") normalized.logline = decoded.logline;
    if (typeof decoded.updatedAt === "string") normalized.updatedAt = decoded.updatedAt;

    return normalized;
  }

  private normalizePlotPayload(projectId: string, payload: unknown): Record<string, unknown> {
    const decoded = this.decodeWorldDocumentPayload(projectId, "plot", payload);
    if (!isRecord(decoded)) {
      return { columns: [] };
    }

    const rawColumns = Array.isArray(decoded.columns) ? decoded.columns : [];
    const columns = rawColumns
      .filter((column): column is Record<string, unknown> => isRecord(column))
      .map((column, columnIndex) => {
        const rawCards = Array.isArray(column.cards) ? column.cards : [];
        const cards = rawCards
          .filter((card): card is Record<string, unknown> => isRecord(card))
          .map((card, cardIndex) => ({
            id:
              typeof card.id === "string" && card.id.length > 0
                ? card.id
                : `card-${columnIndex}-${cardIndex}`,
            content: typeof card.content === "string" ? card.content : "",
          }));

        return {
          id:
            typeof column.id === "string" && column.id.length > 0
              ? column.id
              : `col-${columnIndex}`,
          title: typeof column.title === "string" ? column.title : "",
          cards,
        };
      });

    return {
      columns,
      updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
    };
  }

  private normalizeDrawingPayload(projectId: string, payload: unknown): Record<string, unknown> {
    const decoded = this.decodeWorldDocumentPayload(projectId, "drawing", payload);
    if (!isRecord(decoded)) {
      return { paths: [] };
    }

    return {
      paths: normalizeWorldDrawingPaths(decoded.paths),
      tool: toWorldDrawingTool(decoded.tool),
      iconType: toWorldDrawingIcon(decoded.iconType),
      color: typeof decoded.color === "string" ? decoded.color : undefined,
      lineWidth: typeof decoded.lineWidth === "number" ? decoded.lineWidth : undefined,
      updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
    };
  }

  private normalizeMindmapPayload(projectId: string, payload: unknown): Record<string, unknown> {
    const decoded = this.decodeWorldDocumentPayload(projectId, "mindmap", payload);
    if (!isRecord(decoded)) {
      return { nodes: [], edges: [] };
    }

    return {
      nodes: normalizeWorldMindmapNodes(decoded.nodes),
      edges: normalizeWorldMindmapEdges(decoded.edges),
      updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
    };
  }

  private normalizeGraphPayload(projectId: string, payload: unknown): Record<string, unknown> {
    const decoded = this.decodeWorldDocumentPayload(projectId, "graph", payload);
    if (!isRecord(decoded)) {
      return { nodes: [], edges: [] };
    }

    const nodes = Array.isArray(decoded.nodes)
      ? decoded.nodes.filter((node): node is Record<string, unknown> => isRecord(node))
      : [];
    const edges = Array.isArray(decoded.edges)
      ? decoded.edges.filter((edge): edge is Record<string, unknown> => isRecord(edge))
      : [];

    return {
      nodes,
      edges,
      updatedAt: typeof decoded.updatedAt === "string" ? decoded.updatedAt : undefined,
    };
  }

  private normalizeScrapPayload(
    projectId: string,
    payload: unknown,
    fallbackMemos: Array<{
      id: string;
      title: string;
      content: string;
      tags: string[];
      updatedAt: string;
    }>,
    updatedAtFallback: string,
  ): Record<string, unknown> {
    const decoded = this.decodeWorldDocumentPayload(projectId, "scrap", payload);
    if (!isRecord(decoded)) {
      return {
        memos: fallbackMemos.map((memo) => ({
          id: memo.id,
          title: memo.title,
          content: memo.content,
          tags: memo.tags,
          updatedAt: memo.updatedAt,
        })),
        updatedAt: updatedAtFallback,
      };
    }

    const normalized = normalizeWorldScrapPayload(decoded);
    return {
      memos: normalized.memos,
      updatedAt:
        typeof normalized.updatedAt === "string" ? normalized.updatedAt : updatedAtFallback,
    };
  }

  private collectDeletedProjectIds(bundle: SyncBundle): Set<string> {
    const deletedProjectIds = new Set<string>();
    for (const project of bundle.projects) {
      if (project.deletedAt) deletedProjectIds.add(project.id);
    }
    for (const tombstone of bundle.tombstones) {
      if (tombstone.entityType !== "project") continue;
      deletedProjectIds.add(tombstone.entityId);
      deletedProjectIds.add(tombstone.projectId);
    }
    return deletedProjectIds;
  }

  private async applyProjectDeletes(
    prisma: ReturnType<(typeof db)["getClient"]>,
    deletedProjectIds: Set<string>,
  ): Promise<void> {
    for (const projectId of deletedProjectIds) {
      const existing = (await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      })) as { id?: string } | null;
      if (!existing?.id) continue;
      await prisma.project.delete({ where: { id: projectId } });
    }
  }

  private async upsertProjects(
    prisma: ReturnType<(typeof db)["getClient"]>,
    projects: SyncBundle["projects"],
    deletedProjectIds: Set<string>,
  ): Promise<void> {
    for (const project of projects) {
      if (project.deletedAt || deletedProjectIds.has(project.id)) continue;
      const existing = (await prisma.project.findUnique({
        where: { id: project.id },
        select: { id: true },
      })) as { id?: string } | null;

      if (existing?.id) {
        await prisma.project.update({
          where: { id: project.id },
          data: {
            title: project.title,
            description: project.description,
            updatedAt: new Date(project.updatedAt),
          },
        });
        continue;
      }

      await prisma.project.create({
        data: {
          id: project.id,
          title: project.title,
          description: project.description,
          createdAt: new Date(project.createdAt),
          updatedAt: new Date(project.updatedAt),
          settings: {
            create: {
              autoSave: true,
              autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
            },
          },
        },
      });
    }
  }

  private async upsertCharacters(
    prisma: ReturnType<(typeof db)["getClient"]>,
    characters: SyncBundle["characters"],
    deletedProjectIds: Set<string>,
  ): Promise<void> {
    for (const character of characters) {
      if (deletedProjectIds.has(character.projectId)) continue;
      const existing = (await prisma.character.findUnique({
        where: { id: character.id },
        select: { id: true },
      })) as { id?: string } | null;

      if (character.deletedAt) {
        if (existing?.id) await prisma.character.delete({ where: { id: character.id } });
        continue;
      }

      const data = {
        name: character.name,
        description: character.description,
        firstAppearance: character.firstAppearance,
        attributes:
          typeof character.attributes === "string"
            ? character.attributes
            : JSON.stringify(character.attributes ?? null),
        updatedAt: new Date(character.updatedAt),
        project: {
          connect: { id: character.projectId },
        },
      };

      if (existing?.id) {
        await prisma.character.update({ where: { id: character.id }, data });
      } else {
        await prisma.character.create({
          data: {
            id: character.id,
            ...data,
            createdAt: new Date(character.createdAt),
          },
        });
      }
    }
  }

  private async upsertTerms(
    prisma: ReturnType<(typeof db)["getClient"]>,
    terms: SyncBundle["terms"],
    deletedProjectIds: Set<string>,
  ): Promise<void> {
    for (const term of terms) {
      if (deletedProjectIds.has(term.projectId)) continue;
      const existing = (await prisma.term.findUnique({
        where: { id: term.id },
        select: { id: true },
      })) as { id?: string } | null;

      if (term.deletedAt) {
        if (existing?.id) await prisma.term.delete({ where: { id: term.id } });
        continue;
      }

      const data = {
        term: term.term,
        definition: term.definition,
        category: term.category,
        order: term.order,
        firstAppearance: term.firstAppearance,
        updatedAt: new Date(term.updatedAt),
        project: {
          connect: { id: term.projectId },
        },
      };

      if (existing?.id) {
        await prisma.term.update({ where: { id: term.id }, data });
      } else {
        await prisma.term.create({
          data: {
            id: term.id,
            ...data,
            createdAt: new Date(term.createdAt),
          },
        });
      }
    }
  }

  private async applyChapterTombstones(
    prisma: ReturnType<(typeof db)["getClient"]>,
    tombstones: SyncBundle["tombstones"],
    deletedProjectIds: Set<string>,
  ): Promise<void> {
    for (const tombstone of tombstones) {
      if (tombstone.entityType !== "chapter") continue;
      if (deletedProjectIds.has(tombstone.projectId)) continue;
      const existing = (await prisma.chapter.findUnique({
        where: { id: tombstone.entityId },
        select: { id: true, projectId: true },
      })) as { id?: string; projectId?: string } | null;
      if (!existing?.id || existing.projectId !== tombstone.projectId) continue;
      await prisma.chapter.update({
        where: { id: tombstone.entityId },
        data: {
          deletedAt: new Date(tombstone.deletedAt),
          updatedAt: new Date(tombstone.updatedAt),
        },
      });
    }
  }

  private async applyMergedBundleToLocal(bundle: SyncBundle): Promise<void> {
    // `.luie` package is the source of truth. Persist it first so DB cache
    // mutations do not commit when package write fails.
    const persistedPackages = await this.persistBundleToLuiePackages(bundle);

    const prisma = db.getClient();
    const deletedProjectIds = this.collectDeletedProjectIds(bundle);
    try {
      await prisma.$transaction(async (tx: unknown) => {
        const transactionClient = tx as ReturnType<(typeof db)["getClient"]>;
        await this.applyProjectDeletes(transactionClient, deletedProjectIds);
        await this.upsertProjects(transactionClient, bundle.projects, deletedProjectIds);

        for (const chapter of bundle.chapters) {
          if (deletedProjectIds.has(chapter.projectId)) continue;
          await this.upsertChapter(transactionClient, chapter);
        }

        await this.upsertCharacters(transactionClient, bundle.characters, deletedProjectIds);
        await this.upsertTerms(transactionClient, bundle.terms, deletedProjectIds);
        await this.applyChapterTombstones(transactionClient, bundle.tombstones, deletedProjectIds);
      });
    } catch (error) {
      const persistedProjectIds = persistedPackages.map((item) => item.projectId);
      logger.error("Failed to apply merged bundle to DB cache after .luie persistence", {
        error,
        persistedProjectIds,
      });

      const failedRecoveryProjectIds = await this.recoverDbCacheFromPersistedPackages(
        persistedPackages,
      );
      if (failedRecoveryProjectIds.length > 0) {
        throw new Error(
          `SYNC_DB_CACHE_APPLY_FAILED:${persistedProjectIds.join(",") || "none"};SYNC_DB_CACHE_RECOVERY_FAILED:${failedRecoveryProjectIds.join(",")}`,
        );
      }
      throw new Error(`SYNC_DB_CACHE_APPLY_FAILED:${persistedProjectIds.join(",") || "none"}`);
    }
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
    const project = bundle.projects.find((item) => item.id === projectId);
    if (!project || project.deletedAt) return null;

    const chapters = bundle.chapters
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .sort((left, right) => left.order - right.order);
    const characters = bundle.characters
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? undefined,
        firstAppearance: item.firstAppearance ?? undefined,
        attributes: item.attributes ?? undefined,
      }));
    const terms = bundle.terms
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .sort((left, right) => left.order - right.order)
      .map((item) => ({
        id: item.id,
        term: item.term,
        definition: item.definition ?? undefined,
        category: item.category ?? undefined,
        firstAppearance: item.firstAppearance ?? undefined,
      }));

    const worldDocs = new Map<WorldDocumentType, unknown>();
    for (const doc of sortByUpdatedAtDesc(bundle.worldDocuments)) {
      if (doc.projectId !== projectId || doc.deletedAt) continue;
      if (worldDocs.has(doc.docType)) continue;
      worldDocs.set(doc.docType, doc.payload);
    }

    await this.hydrateMissingWorldDocsFromPackage(worldDocs, projectPath);

    const memos = bundle.memos
      .filter((item) => item.projectId === projectId && !item.deletedAt)
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        tags: item.tags,
        updatedAt: item.updatedAt,
      }));

    const snapshotList = localSnapshots.map((snapshot) => ({
      id: snapshot.id,
      chapterId: snapshot.chapterId ?? undefined,
      content: snapshot.content,
      description: snapshot.description ?? undefined,
      createdAt: snapshot.createdAt.toISOString(),
    }));

    const normalizedSynopsisPayload = this.normalizeSynopsisPayload(
      projectId,
      worldDocs.get("synopsis"),
    );
    const normalizedPlotPayload = this.normalizePlotPayload(
      projectId,
      worldDocs.get("plot"),
    );
    const normalizedDrawingPayload = this.normalizeDrawingPayload(
      projectId,
      worldDocs.get("drawing"),
    );
    const normalizedMindmapPayload = this.normalizeMindmapPayload(
      projectId,
      worldDocs.get("mindmap"),
    );
    const normalizedGraphPayload = this.normalizeGraphPayload(
      projectId,
      worldDocs.get("graph"),
    );
    const normalizedScrapPayload = this.normalizeScrapPayload(
      projectId,
      worldDocs.get("scrap"),
      memos,
      project.updatedAt,
    );

    const metaChapters = chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      file: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
      updatedAt: chapter.updatedAt,
    }));

    return {
      meta: {
        format: LUIE_PACKAGE_FORMAT,
        container: LUIE_PACKAGE_CONTAINER_DIR,
        version: LUIE_PACKAGE_VERSION,
        projectId: project.id,
        title: project.title,
        description: project.description ?? undefined,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        chapters: metaChapters,
      },
      chapters: chapters.map((chapter) => ({
        id: chapter.id,
        content: chapter.content,
      })),
      characters,
      terms,
      synopsis: normalizedSynopsisPayload,
      plot: normalizedPlotPayload,
      drawing: normalizedDrawingPayload,
      mindmap: normalizedMindmapPayload,
      graph: normalizedGraphPayload,
      memos: normalizedScrapPayload,
      snapshots: snapshotList,
    };
  }

  private async persistBundleToLuiePackages(
    bundle: SyncBundle,
  ): Promise<PersistedLuiePackage[]> {
    const failedProjects: string[] = [];
    const persistedProjects: PersistedLuiePackage[] = [];
    for (const project of bundle.projects) {
      const localProject = await db.getClient().project.findUnique({
        where: { id: project.id },
        select: {
          projectPath: true,
          snapshots: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              chapterId: true,
              content: true,
              description: true,
              createdAt: true,
            },
          },
        },
      }) as {
        projectPath?: string | null;
        snapshots?: Array<{
          id: string;
          chapterId: string | null;
          content: string;
          description: string | null;
          createdAt: Date;
        }>;
      } | null;

      const projectPath = toNullableString(localProject?.projectPath);
      if (!projectPath || !projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
        continue;
      }
      let safeProjectPath: string;
      try {
        safeProjectPath = ensureSafeAbsolutePath(projectPath, "projectPath");
      } catch (error) {
        logger.warn("Skipping .luie persistence for invalid projectPath", {
          projectId: project.id,
          projectPath,
          error,
        });
        continue;
      }
      const payload = await this.buildProjectPackagePayload(
        bundle,
        project.id,
        safeProjectPath,
        localProject?.snapshots ?? [],
      );
      if (!payload) continue;

      try {
        await writeLuiePackage(safeProjectPath, payload, logger);
        persistedProjects.push({
          projectId: project.id,
          projectPath: safeProjectPath,
        });
      } catch (error) {
        failedProjects.push(project.id);
        logger.error("Failed to persist merged bundle into .luie package", {
          projectId: project.id,
          projectPath: safeProjectPath,
          error,
        });
      }
    }
    if (failedProjects.length > 0) {
      throw new Error(`SYNC_LUIE_PERSIST_FAILED:${failedProjects.join(",")}`);
    }
    return persistedProjects;
  }

  private async recoverDbCacheFromPersistedPackages(
    persistedPackages: PersistedLuiePackage[],
  ): Promise<string[]> {
    if (persistedPackages.length === 0) return [];

    const failedProjectIds: string[] = [];
    for (const entry of persistedPackages) {
      try {
        await projectService.openLuieProject(entry.projectPath);
      } catch (error) {
        failedProjectIds.push(entry.projectId);
        logger.error("Failed to recover DB cache from persisted .luie package", {
          projectId: entry.projectId,
          projectPath: entry.projectPath,
          error,
        });
      }
    }
    return failedProjectIds;
  }

  private async upsertChapter(
    prisma: ReturnType<(typeof db)["getClient"]>,
    chapter: SyncChapterRecord,
  ): Promise<void> {
    const existing = await prisma.chapter.findUnique({
      where: { id: chapter.id },
      select: { id: true },
    }) as { id?: string } | null;

    const data = {
      title: chapter.title,
      content: chapter.content,
      synopsis: chapter.synopsis,
      order: chapter.order,
      wordCount: chapter.wordCount,
      updatedAt: new Date(chapter.updatedAt),
      deletedAt: chapter.deletedAt ? new Date(chapter.deletedAt) : null,
      project: {
        connect: { id: chapter.projectId },
      },
    };

    if (existing?.id) {
      await prisma.chapter.update({
        where: { id: chapter.id },
        data,
      });
    } else {
      await prisma.chapter.create({
        data: {
          id: chapter.id,
          ...data,
          createdAt: new Date(chapter.createdAt),
        },
      });
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
