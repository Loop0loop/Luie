import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  const handleOAuthCallback = vi.fn<(...args: unknown[]) => Promise<void>>();
  const status = {
    connected: false,
    autoSync: true,
    mode: "idle" as const,
    inFlight: false,
    queued: false,
    conflicts: {
      chapters: 0,
      memos: 0,
      total: 0,
    },
  };
  const mainWindow = {
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    focus: vi.fn(),
    isDestroyed: vi.fn(() => false),
    webContents: {
      send: vi.fn(),
    },
  };

  return {
    handleOAuthCallback,
    status,
    mainWindow,
  };
});

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
  BrowserWindow: {
    getAllWindows: () => [mocked.mainWindow],
  },
}));

vi.mock("../../../src/main/manager/index.js", () => ({
  windowManager: {
    getMainWindow: () => mocked.mainWindow,
    getStartupWizardWindow: () => null,
  },
}));

vi.mock("../../../src/main/services/features/syncService.js", () => ({
  syncService: {
    handleOAuthCallback: (...args: unknown[]) => mocked.handleOAuthCallback(...args),
    getStatus: () => mocked.status,
  },
}));

describe("deepLink OAuth callback routing", () => {
  beforeEach(() => {
    vi.resetModules();
    mocked.handleOAuthCallback.mockReset();
    mocked.mainWindow.isMinimized.mockReset();
    mocked.mainWindow.restore.mockReset();
    mocked.mainWindow.focus.mockReset();
    mocked.mainWindow.isDestroyed.mockReset();
    mocked.mainWindow.webContents.send.mockReset();
    mocked.mainWindow.isMinimized.mockReturnValue(false);
    mocked.mainWindow.isDestroyed.mockReturnValue(false);
    mocked.status.connected = false;
    mocked.status.mode = "idle";
  });

  it("broadcasts stale result when callback is stale but already connected", async () => {
    mocked.status.connected = true;
    mocked.handleOAuthCallback.mockRejectedValue(new Error("SYNC_AUTH_NO_PENDING_SESSION"));

    const { handleDeepLinkUrl } = await import("../../../src/main/lifecycle/deepLink.js");
    const handled = await handleDeepLinkUrl("luie://auth/callback?error=invalid_request");

    expect(handled).toBe(true);
    expect(mocked.mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.SYNC_AUTH_RESULT,
      expect.objectContaining({
        status: "stale",
        reason: "NO_PENDING",
      }),
    );
  });

  it("broadcasts error result for unknown callback failure", async () => {
    mocked.status.connected = true;
    mocked.handleOAuthCallback.mockRejectedValue(new Error("OAUTH_FLOW_BROKEN"));

    const { handleDeepLinkUrl } = await import("../../../src/main/lifecycle/deepLink.js");
    const handled = await handleDeepLinkUrl("luie://auth/callback?error=invalid_request");

    expect(handled).toBe(false);
    expect(mocked.mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.SYNC_AUTH_RESULT,
      expect.objectContaining({
        status: "error",
        reason: "UNKNOWN",
      }),
    );
  });

  it("does not remap Supabase bad_oauth_state to local STATE_MISMATCH", async () => {
    mocked.status.connected = true;
    mocked.handleOAuthCallback.mockRejectedValue(
      new Error("SYNC_AUTH_CALLBACK_ERROR:bad_oauth_state:OAuth state parameter is invalid"),
    );

    const { handleDeepLinkUrl } = await import("../../../src/main/lifecycle/deepLink.js");
    const handled = await handleDeepLinkUrl(
      "luie://auth/callback?error=invalid_request&error_code=bad_oauth_state",
    );

    expect(handled).toBe(false);
    expect(mocked.mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNELS.SYNC_AUTH_RESULT,
      expect.objectContaining({
        status: "error",
        reason: "UNKNOWN",
      }),
    );
  });
});
