import type {
  SyncPendingProjectDelete,
  SyncSettings,
  SyncStatus,
} from "../../../../shared/types/index.js";

export const AUTO_SYNC_DEBOUNCE_MS = 1500;

export const INITIAL_STATUS: SyncStatus = {
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

const AUTH_FATAL_ERROR_PATTERNS = [
  "SYNC_ACCESS_TOKEN_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_UNAVAILABLE",
  "SYNC_AUTH_REFRESH_FAILED",
  "SYNC_AUTH_INVALID_SESSION",
  "SYNC_TOKEN_DECRYPT_FAILED",
  "SYNC_TOKEN_SECURE_STORAGE_UNAVAILABLE",
];

export type SyncConflictResolutionInput = {
  type: "chapter" | "memo";
  id: string;
  resolution: "local" | "remote";
};

export const toSyncErrorMessage = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.startsWith("SUPABASE_SCHEMA_MISSING:")) {
    const table = raw.split(":")[1] ?? "unknown";
    return `SYNC_REMOTE_SCHEMA_MISSING:${table}: apply supabase/migrations/20260219000000_luie_sync.sql to this Supabase project`;
  }
  return raw;
};

export const isAuthFatalMessage = (message: string): boolean =>
  AUTH_FATAL_ERROR_PATTERNS.some((pattern) => message.includes(pattern));

export const toSyncStatusFromSettings = (
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

export const normalizePendingProjectDeletes = (
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
