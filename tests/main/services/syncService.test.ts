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
  const hasPendingAuthFlow = vi.fn(() => false);
  const fetchBundle = vi.fn();
  const upsertBundle = vi.fn();

  const prisma = {
    project: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(),
      create: vi.fn(),
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
    completeOAuthCallback: vi.fn(),
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
      for (const key of Object.keys(mocked.syncSettings)) {
        delete (mocked.syncSettings as Record<string, unknown>)[key];
      }
      mocked.syncSettings.connected = false;
      mocked.syncSettings.autoSync = true;
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
    mocked.getRefreshToken.mockReturnValue({ token: null });

    const { SyncService } = await import("../../../src/main/services/features/syncService.js");
    const service = new SyncService();
    service.initialize();
    expect(service.getStatus().lastError).toContain("SYNC_ACCESS_TOKEN_UNAVAILABLE");
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
});
