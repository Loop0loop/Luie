import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncSettings } from "../../../src/shared/types/index.js";

const mocked = vi.hoisted(() => {
  const syncSettings: SyncSettings = {
    connected: false,
    autoSync: true,
  };

  const getAccessToken = vi.fn();
  const getRefreshToken = vi.fn();
  const refreshSession = vi.fn();
  const startGoogleAuth = vi.fn();
  const completeOAuthCallback = vi.fn();
  const hasPendingAuthFlow = vi.fn(() => false);
  const fetchBundle = vi.fn();
  const upsertBundle = vi.fn();

  const prisma = {
    project: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    chapter: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    character: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    term: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    snapshot: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  };

  return {
    syncSettings,
    getAccessToken,
    getRefreshToken,
    refreshSession,
    startGoogleAuth,
    completeOAuthCallback,
    hasPendingAuthFlow,
    fetchBundle,
    upsertBundle,
    prisma,
  };
});

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
}));

vi.mock("../../../src/main/handler/system/ipcFsHandlers.js", () => ({
  writeLuiePackage: vi.fn(),
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    getClient: () => mocked.prisma,
  },
}));

vi.mock("../../../src/main/services/features/syncAuthService.js", () => ({
  syncAuthService: {
    isConfigured: () => true,
    hasPendingAuthFlow: (...args: unknown[]) => mocked.hasPendingAuthFlow(...args),
    startGoogleAuth: (...args: unknown[]) => mocked.startGoogleAuth(...args),
    completeOAuthCallback: (...args: unknown[]) => mocked.completeOAuthCallback(...args),
    getAccessToken: (...args: unknown[]) => mocked.getAccessToken(...args),
    getRefreshToken: (...args: unknown[]) => mocked.getRefreshToken(...args),
    refreshSession: (...args: unknown[]) => mocked.refreshSession(...args),
  },
}));

vi.mock("../../../src/main/services/features/syncRepository.js", () => ({
  syncRepository: {
    fetchBundle: (...args: unknown[]) => mocked.fetchBundle(...args),
    upsertBundle: (...args: unknown[]) => mocked.upsertBundle(...args),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getSyncSettings: () => ({ ...mocked.syncSettings }),
    setSyncSettings: (patch: Partial<SyncSettings>) => {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete (mocked.syncSettings as Record<string, unknown>)[key];
        } else {
          (mocked.syncSettings as Record<string, unknown>)[key] = value;
        }
      }
      return { ...mocked.syncSettings };
    },
    clearSyncSettings: () => {
      const pendingDeletes = Array.isArray(mocked.syncSettings.pendingProjectDeletes)
        ? [...mocked.syncSettings.pendingProjectDeletes]
        : undefined;
      for (const key of Object.keys(mocked.syncSettings)) {
        delete (mocked.syncSettings as Record<string, unknown>)[key];
      }
      mocked.syncSettings.connected = false;
      mocked.syncSettings.autoSync = true;
      if (pendingDeletes && pendingDeletes.length > 0) {
        mocked.syncSettings.pendingProjectDeletes = pendingDeletes;
      }
      return { ...mocked.syncSettings };
    },
    removePendingProjectDeletes: (projectIds: string[]) => {
      const pending = Array.isArray(mocked.syncSettings.pendingProjectDeletes)
        ? mocked.syncSettings.pendingProjectDeletes
        : [];
      const idSet = new Set(projectIds);
      const filtered = pending.filter((entry) => !idSet.has(entry.projectId));
      if (filtered.length === 0) {
        delete (mocked.syncSettings as Record<string, unknown>).pendingProjectDeletes;
      } else {
        mocked.syncSettings.pendingProjectDeletes = filtered;
      }
      return { ...mocked.syncSettings };
    },
  },
}));

describe("SyncService auth hardening", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mocked.getAccessToken.mockReset();
    mocked.getRefreshToken.mockReset();
    mocked.refreshSession.mockReset();
    mocked.startGoogleAuth.mockReset();
    mocked.completeOAuthCallback.mockReset();
    mocked.hasPendingAuthFlow.mockReset();
    mocked.hasPendingAuthFlow.mockReturnValue(false);
    mocked.getRefreshToken.mockReturnValue({ token: null });
    mocked.fetchBundle.mockReset();
    mocked.upsertBundle.mockReset();
    mocked.prisma.project.findMany.mockResolvedValue([]);
    mocked.prisma.project.findUnique.mockResolvedValue(null);

    for (const key of Object.keys(mocked.syncSettings)) {
      delete (mocked.syncSettings as Record<string, unknown>)[key];
    }
    mocked.syncSettings.connected = false;
    mocked.syncSettings.autoSync = true;
    delete (mocked.syncSettings as Record<string, unknown>).pendingProjectDeletes;
  });

  it("downgrades connected state on startup when no usable token path exists", async () => {
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.getAccessToken.mockReturnValue({ token: null });
    mocked.getRefreshToken.mockReturnValue({ token: null });

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();

    const status = service.getStatus();
    expect(status.connected).toBe(false);
    expect(status.lastError).toContain("SYNC_ACCESS_TOKEN_UNAVAILABLE");
  });

  it("disconnects on startup when refresh token is unreadable", async () => {
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.refreshTokenCipher = "broken-refresh";
    mocked.getAccessToken.mockReturnValue({ token: null });
    mocked.getRefreshToken.mockReturnValue({
      token: null,
      errorCode: "SYNC_TOKEN_DECRYPT_FAILED:broken-refresh",
    });

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    expect(service.getStatus().lastError).toContain("SYNC_TOKEN_DECRYPT_FAILED");
    expect(service.getStatus().connected).toBe(false);
    expect(mocked.fetchBundle).not.toHaveBeenCalled();
    expect(mocked.refreshSession).not.toHaveBeenCalled();
  });

  it("keeps connected state for non-auth transient errors", async () => {
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.fetchBundle.mockRejectedValue(new Error("NETWORK_TIMEOUT"));

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(false);
    expect(result.message).toContain("NETWORK_TIMEOUT");
    expect(service.getStatus().connected).toBe(true);
  });

  it("keeps disconnected state and exposes callback error for re-login after oauth failure", async () => {
    mocked.syncSettings.connected = false;
    mocked.syncSettings.autoSync = true;
    mocked.completeOAuthCallback.mockRejectedValue(
      new Error("SYNC_AUTH_CALLBACK_ERROR:bad_oauth_state:OAuth callback with invalid state"),
    );

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();

    await expect(
      service.handleOAuthCallback(
        "luie://auth/callback?error=invalid_request&error_code=bad_oauth_state",
      ),
    ).rejects.toThrow("SYNC_AUTH_CALLBACK_ERROR:bad_oauth_state");

    expect(service.getStatus().connected).toBe(false);
    expect(service.getStatus().mode).toBe("error");
    expect(service.getStatus().lastError).toContain("bad_oauth_state");
  });

  it("does not launch OAuth again while already connecting", async () => {
    mocked.startGoogleAuth.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();

    await service.connectGoogle();
    await service.connectGoogle();

    expect(mocked.startGoogleAuth).toHaveBeenCalledTimes(1);
    expect(service.getStatus().mode).toBe("connecting");
  });

  it("syncs queued project deletions as tombstones and clears queue after success", async () => {
    const deletedAt = new Date().toISOString();
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.syncSettings.pendingProjectDeletes = [
      {
        projectId: "project-1",
        deletedAt,
      },
    ];
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(true);
    const upsertPayload = mocked.upsertBundle.mock.calls[0]?.[1] as {
      tombstones: Array<{ entityType: string; entityId: string; deletedAt: string }>;
    };
    expect(upsertPayload.tombstones).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityType: "project",
          entityId: "project-1",
          deletedAt,
        }),
      ]),
    );
    expect(mocked.syncSettings.pendingProjectDeletes).toBeUndefined();
  });

  it("updates per-project sync timestamps on successful sync", async () => {
    const syncedUserId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.autoSync = false;
    mocked.syncSettings.userId = syncedUserId;
    mocked.syncSettings.expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    mocked.syncSettings.accessTokenCipher = "cipher";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });
    mocked.getRefreshToken.mockReturnValue({ token: "refresh-token" });
    mocked.prisma.project.findMany.mockResolvedValue([
      {
        id: "project-1",
        title: "Project",
        description: null,
        createdAt: new Date("2026-02-22T00:00:00.000Z"),
        updatedAt: new Date("2026-02-22T00:00:00.000Z"),
        projectPath: null,
        chapters: [],
        characters: [],
        terms: [],
      },
    ]);
    mocked.fetchBundle.mockResolvedValue({
      projects: [],
      chapters: [],
      characters: [],
      terms: [],
      worldDocuments: [],
      memos: [],
      snapshots: [],
      tombstones: [],
    });
    mocked.upsertBundle.mockResolvedValue(undefined);

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    const result = await service.runNow("manual");

    expect(result.success).toBe(true);
    expect(
      mocked.syncSettings.projectLastSyncedAtByProjectId?.["project-1"],
    ).toBeTruthy();
  });
});
