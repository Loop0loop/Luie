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
    getAccessToken: vi.fn(() => ({ token: null })),
    getRefreshToken: vi.fn(() => ({ token: null })),
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

vi.mock("../../../src/main/database/index.js", () => ({
  db: {
    initialize: (...args: unknown[]) => mocked.initializeDb(...args),
    getClient: () => ({
      $executeRawUnsafe: (...args: unknown[]) => mocked.executeRaw(...args),
    }),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getStartupSettings: () => ({ completedAt: mocked.startup.completedAt }),
    setStartupCompletedAt: (value: string) => {
      mocked.startup.completedAt = value;
      return { completedAt: mocked.startup.completedAt };
    },
    getSyncSettings: () => ({ ...mocked.syncSettings }),
  },
}));

vi.mock("../../../src/main/services/features/supabaseEnv.js", () => ({
  getSupabaseConfig: () => mocked.supabaseConfig.current,
  getSupabaseConfigSource: () => mocked.supabaseSource.current,
}));

vi.mock("../../../src/main/services/features/syncAuthService.js", () => ({
  syncAuthService: {
    getAccessToken: (...args: unknown[]) => mocked.getAccessToken(...args),
    getRefreshToken: (...args: unknown[]) => mocked.getRefreshToken(...args),
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
    expect(readiness.reasons).toContain("supabaseSession");
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
