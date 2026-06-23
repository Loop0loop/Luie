import type {
  SyncEntityBaseline,
  SyncPendingProjectDelete,
  SyncSettings,
} from "../../../shared/types/index.js";
import { normalizeRuntimeSupabaseConfig } from "./settingsDefaults.js";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const normalizePendingProjectDeletes = (
  value: unknown,
): SyncPendingProjectDelete[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .filter(
      (entry): entry is SyncPendingProjectDelete =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            isNonEmptyString((entry as { projectId?: unknown }).projectId) &&
            isNonEmptyString((entry as { deletedAt?: unknown }).deletedAt),
        ),
    )
    .map((entry) => ({
      projectId: entry.projectId,
      deletedAt: entry.deletedAt,
    }));
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeStringMap = (value: unknown): Record<string, string> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const normalized = Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => isNonEmptyString(entry[0]) && isNonEmptyString(entry[1]),
    ),
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeEntityBaseline = (value: unknown): SyncEntityBaseline | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const baseline = value as SyncEntityBaseline;
  return {
    chapter: normalizeStringMap(baseline.chapter) ?? {},
    memo: normalizeStringMap(baseline.memo) ?? {},
    capturedAt: isNonEmptyString(baseline.capturedAt)
      ? baseline.capturedAt
      : new Date().toISOString(),
  };
};

const normalizeEntityBaselines = (
  value: unknown,
): Record<string, SyncEntityBaseline> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const normalized = Object.fromEntries(
    Object.entries(value)
      .filter(([projectId]) => isNonEmptyString(projectId))
      .map(([projectId, baseline]) => [projectId, normalizeEntityBaseline(baseline)])
      .filter((entry): entry is [string, SyncEntityBaseline] => Boolean(entry[1])),
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizePendingConflictResolutions = (
  value: unknown,
): Record<string, "local" | "remote"> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const normalized = Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, "local" | "remote"] =>
        isNonEmptyString(entry[0]) && (entry[1] === "local" || entry[1] === "remote"),
    ),
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const normalizeSyncSettings = (value: SyncSettings | undefined): SyncSettings => {
  const current: Partial<SyncSettings> = value ?? {};
  return {
    connected: current.connected ?? false,
    provider: current.provider,
    email: current.email,
    userId: current.userId,
    expiresAt: current.expiresAt,
    autoSync: current.autoSync ?? true,
    lastSyncedAt: current.lastSyncedAt,
    lastError: current.lastError,
    accessTokenCipher: current.accessTokenCipher,
    refreshTokenCipher: current.refreshTokenCipher,
    pendingAuthState: current.pendingAuthState,
    pendingAuthVerifierCipher: current.pendingAuthVerifierCipher,
    pendingAuthCreatedAt: current.pendingAuthCreatedAt,
    pendingAuthRedirectUri: current.pendingAuthRedirectUri,
    pendingProjectDeletes: normalizePendingProjectDeletes(current.pendingProjectDeletes),
    projectLastSyncedAtByProjectId: normalizeStringMap(current.projectLastSyncedAtByProjectId),
    entityBaselinesByProjectId: normalizeEntityBaselines(current.entityBaselinesByProjectId),
    pendingConflictResolutions: normalizePendingConflictResolutions(
      current.pendingConflictResolutions,
    ),
    runtimeSupabaseConfig: normalizeRuntimeSupabaseConfig(current.runtimeSupabaseConfig),
  };
};
