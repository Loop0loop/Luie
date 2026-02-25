import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ElectronModule from "electron";
import type { SyncSettings } from "../../../src/shared/types/index.js";

const mocked = vi.hoisted(() => {
  const state: SyncSettings = {
    connected: false,
    autoSync: true,
  };

  const shellOpenExternal = vi.fn();
  const safeStorageState = {
    available: false,
  };

  return {
    state,
    shellOpenExternal,
    safeStorageState,
  };
});

vi.mock("electron", async () => {
  const actual = await vi.importActual<typeof ElectronModule>("electron");
  return {
    ...actual,
    safeStorage: {
      isEncryptionAvailable: () => mocked.safeStorageState.available,
      encryptString: (plain: string) => Buffer.from(`enc:${plain}`, "utf-8"),
      decryptString: (payload: Buffer) => {
        const decoded = payload.toString("utf-8");
        if (!decoded.startsWith("enc:")) {
          throw new Error("invalid encrypted payload");
        }
        return decoded.slice(4);
      },
    },
    shell: {
      openExternal: mocked.shellOpenExternal,
    },
  };
});

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getSyncSettings: () => ({ ...mocked.state }),
    setSyncSettings: (patch: Partial<SyncSettings>) => {
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) {
          delete (mocked.state as Record<string, unknown>)[key];
        } else {
          (mocked.state as Record<string, unknown>)[key] = value;
        }
      }
      return { ...mocked.state };
    },
    setPendingSyncAuth: (input: {
      state: string;
      verifierCipher: string;
      createdAt: string;
    }) => {
      mocked.state.pendingAuthState = input.state;
      mocked.state.pendingAuthVerifierCipher = input.verifierCipher;
      mocked.state.pendingAuthCreatedAt = input.createdAt;
      return { ...mocked.state };
    },
    clearPendingSyncAuth: () => {
      delete mocked.state.pendingAuthState;
      delete mocked.state.pendingAuthVerifierCipher;
      delete mocked.state.pendingAuthCreatedAt;
      return { ...mocked.state };
    },
  },
}));

describe("SyncAuthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    mocked.shellOpenExternal.mockReset();
    mocked.safeStorageState.available = false;
    for (const key of Object.keys(mocked.state)) {
      delete (mocked.state as Record<string, unknown>)[key];
    }
    mocked.state.connected = false;
    mocked.state.autoSync = true;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
  });

  it("restores persisted pending PKCE across restart and completes callback", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            user: {
              id: "00000000-0000-0000-0000-000000000001",
              email: "user@example.com",
            },
          }),
          { status: 200 },
        ),
      );

    const { syncAuthService: firstInstance } = await import(
      "../../../src/main/services/features/syncAuthService.js"
    );
    await firstInstance.startGoogleAuth();

    expect(mocked.shellOpenExternal).toHaveBeenCalledTimes(1);
    const authorizeUrl = String(mocked.shellOpenExternal.mock.calls[0][0]);
    expect(new URL(authorizeUrl).searchParams.get("state")).toBeNull();
    expect(mocked.state.pendingAuthVerifierCipher?.startsWith("v2:plain:")).toBe(true);

    vi.resetModules();
    const { syncAuthService: restarted } = await import(
      "../../../src/main/services/features/syncAuthService.js"
    );

    const session = await restarted.completeOAuthCallback("luie://auth/callback?code=test-code");

    expect(session.userId).toBe("00000000-0000-0000-0000-000000000001");
    expect(mocked.state.pendingAuthState).toBeUndefined();
    expect(mocked.state.pendingAuthVerifierCipher).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails when callback code is missing and clears pending auth", async () => {
    const { syncAuthService } = await import("../../../src/main/services/features/syncAuthService.js");
    await syncAuthService.startGoogleAuth();

    await expect(
      syncAuthService.completeOAuthCallback(
        `luie://auth/callback?state=${encodeURIComponent(String(mocked.state.pendingAuthState))}`,
      ),
    ).rejects.toThrow("SYNC_AUTH_CODE_MISSING");

    expect(mocked.state.pendingAuthState).toBeUndefined();
    expect(mocked.state.pendingAuthVerifierCipher).toBeUndefined();
  });

  it("accepts callback code without state validation", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            user: {
              id: "00000000-0000-0000-0000-000000000001",
              email: "user@example.com",
            },
          }),
          { status: 200 },
        ),
      );

    const { syncAuthService } = await import("../../../src/main/services/features/syncAuthService.js");
    await syncAuthService.startGoogleAuth();

    await expect(
      syncAuthService.completeOAuthCallback("luie://auth/callback?code=test-code"),
    ).resolves.toMatchObject({
      userId: "00000000-0000-0000-0000-000000000001",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("blocks duplicate OAuth start while a recent flow is pending", async () => {
    const { syncAuthService } = await import("../../../src/main/services/features/syncAuthService.js");
    await syncAuthService.startGoogleAuth();

    await expect(syncAuthService.startGoogleAuth()).rejects.toThrow("SYNC_AUTH_FLOW_IN_PROGRESS");
    expect(mocked.shellOpenExternal).toHaveBeenCalledTimes(1);
  });

  it("includes provider error code when callback contains OAuth error", async () => {
    const { syncAuthService } = await import("../../../src/main/services/features/syncAuthService.js");
    await syncAuthService.startGoogleAuth();

    await expect(
      syncAuthService.completeOAuthCallback(
        "luie://auth/callback?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+callback+with+invalid+state",
      ),
    ).rejects.toThrow("SYNC_AUTH_CALLBACK_ERROR:bad_oauth_state");

    expect(mocked.state.pendingAuthState).toBeUndefined();
    expect(mocked.state.pendingAuthVerifierCipher).toBeUndefined();
  });

  it("restores pending verifier even when pendingAuthState is missing", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            user: {
              id: "00000000-0000-0000-0000-000000000001",
              email: "user@example.com",
            },
          }),
          { status: 200 },
        ),
      );

    const { syncAuthService: firstInstance } = await import(
      "../../../src/main/services/features/syncAuthService.js"
    );
    await firstInstance.startGoogleAuth();
    delete mocked.state.pendingAuthState;

    vi.resetModules();
    const { syncAuthService: restarted } = await import(
      "../../../src/main/services/features/syncAuthService.js"
    );
    await expect(
      restarted.completeOAuthCallback("luie://auth/callback?code=test-code"),
    ).resolves.toMatchObject({
      userId: "00000000-0000-0000-0000-000000000001",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns migrated cipher when reading legacy base64 token", async () => {
    const { syncAuthService } = await import("../../../src/main/services/features/syncAuthService.js");
    const legacyCipher = Buffer.from("legacy-token", "utf-8").toString("base64");
    const result = syncAuthService.getAccessToken({
      connected: true,
      autoSync: true,
      accessTokenCipher: legacyCipher,
    });

    expect(result.token).toBe("legacy-token");
    expect(result.migratedCipher?.startsWith("v2:plain:")).toBe(true);
  });

  it("returns false when Supabase env is not configured", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPADATABASE_PRJ_ID;
    delete process.env.SUPADATABASE_API;

    const { syncAuthService } = await import("../../../src/main/services/features/syncAuthService.js");
    expect(syncAuthService.isConfigured()).toBe(false);
  });
});
