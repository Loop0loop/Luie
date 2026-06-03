import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeSupabaseConfig, SyncSettings } from "../../../src/shared/types/index.js";

const mocked = vi.hoisted(() => {
  const startup = { completedAt: undefined as string | undefined };
  const syncSettings: SyncSettings = {
    connected: false,
    autoSync: true,
  };
  const supabaseConfig = { current: null as RuntimeSupabaseConfig | null };
  const supabaseSource = { current: null as "env" | "runtime" | "legacy" | null };

  return {
    startup,
    syncSettings,
    supabaseConfig,
    supabaseSource,
    initializeDb: vi.fn(async () => undefined),
    executeRaw: vi.fn(async () => undefined),
    getAccessToken: vi.fn((): { token: string | null } => ({ token: null })),
    getRefreshToken: vi.fn((): { token: string | null } => ({ token: null })),
  };
});

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name === "userData") return "/tmp/luie-test-userData";
      if (name === "documents") return "/tmp/luie-test-documents";
      return "/tmp";
    },
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
  },
}));

vi.mock("better-sqlite3", () => ({
  default: class MockDatabase {
    pragma() {
      return [{ integrity_check: "ok" }];
    }

    close() {}
  },
}));

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: () => mocked.initializeDb(),
    getDatabasePath: () => "/tmp/luie-test-main.sqlite",
    getConnectionPragmas: () => ({
      journalMode: "wal",
      foreignKeys: 1,
      busyTimeout: 5000,
      synchronous: 2,
      walAutocheckpoint: 1000,
    }),
    getClient: () => ({
      $executeRawUnsafe: () => mocked.executeRaw(),
    }),
    getDrizzleClient: () => ({
      select: vi.fn(() => ({
        from: vi.fn(() => Promise.resolve([{ value: 0 }])),
      })),
    }),
  },
}));

vi.mock("../../../src/main/database/cache/index.js", () => ({
  cacheDb: {
    initialize: () => mocked.initializeDb(),
    getClient: () => ({
      $executeRawUnsafe: () => mocked.executeRaw(),
    }),
    getConnectionPragmas: () => ({
      journalMode: "wal",
      foreignKeys: 1,
      busyTimeout: 5000,
      synchronous: 2,
      walAutocheckpoint: 1000,
    }),
    getDrizzleClient: () => ({}),
  },
}));

vi.mock("../../../src/main/manager/settings/index.js", () => ({
  settingsManager: {
    getStartupSettings: () => ({ completedAt: mocked.startup.completedAt }),
    setStartupCompletedAt: (value: string) => {
      mocked.startup.completedAt = value;
      return { completedAt: mocked.startup.completedAt };
    },
    getSyncSettings: () => ({ ...mocked.syncSettings }),
  },
}));

vi.mock("../../../src/main/services/features/sync/supabaseEnv.js", () => ({
  getSupabaseConfig: () => mocked.supabaseConfig.current,
  getSupabaseConfigSource: () => mocked.supabaseSource.current,
}));

vi.mock("../../../src/main/services/features/sync/syncAuthService.js", () => ({
  syncAuthService: {
    getAccessToken: () => mocked.getAccessToken(),
    getRefreshToken: () => mocked.getRefreshToken(),
  },
}));

describe("startupReadinessService", () => {
  beforeEach(() => {
    vi.resetModules();
    mocked.startup.completedAt = undefined;
    mocked.syncSettings.connected = false;
    mocked.syncSettings.autoSync = true;
    mocked.syncSettings.userId = undefined;
    mocked.syncSettings.email = undefined;
    mocked.supabaseConfig.current = null;
    mocked.supabaseSource.current = null;
    mocked.initializeDb.mockReset();
    mocked.executeRaw.mockReset();
    mocked.getAccessToken.mockReset();
    mocked.getRefreshToken.mockReset();
    mocked.initializeDb.mockResolvedValue(undefined);
    mocked.executeRaw.mockResolvedValue(undefined);
    mocked.getAccessToken.mockReturnValue({ token: null });
    mocked.getRefreshToken.mockReturnValue({ token: null });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true, userId: "00000000-0000-0000-0000-000000000001" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forces wizard when runtime config and sync session are missing", async () => {
    const { startupReadinessService } = await import(
      "../../../src/main/services/features/startupReadinessService.js"
    );
    const readiness = await startupReadinessService.getReadiness();
    expect(readiness.mustRunWizard).toBe(true);
    expect(readiness.reasons).toContain("supabaseRuntimeConfig");
    expect(readiness.reasons).not.toContain("supabaseSession");
  });

  it("completes wizard only when all checks pass", async () => {
    mocked.supabaseConfig.current = {
      url: "https://example.supabase.co",
      anonKey: "anon-key-anon-key-anon-key",
    };
    mocked.supabaseSource.current = "runtime";
    mocked.syncSettings.connected = true;
    mocked.syncSettings.userId = "00000000-0000-0000-0000-000000000001";
    mocked.syncSettings.email = "user@example.com";
    mocked.getAccessToken.mockReturnValue({ token: "access-token" });

    const { startupReadinessService } = await import(
      "../../../src/main/services/features/startupReadinessService.js"
    );

    const readinessBefore = await startupReadinessService.getReadiness();
    expect(readinessBefore.mustRunWizard).toBe(true);

    const completed = await startupReadinessService.completeWizard();
    expect(completed.reasons).toEqual([]);
    expect(completed.mustRunWizard).toBe(false);
    expect(mocked.startup.completedAt).toBeTypeOf("string");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/luieEnv",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });
});
