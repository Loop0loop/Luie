import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const openExternal = vi.fn<(...args: unknown[]) => Promise<void>>();
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
  };

  return {
    openExternal,
    handleOAuthCallback,
    status,
    mainWindow,
  };
});

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
  },
  shell: {
    openExternal: (...args: unknown[]) => mocked.openExternal(...args),
  },
}));

vi.mock("../../../src/main/manager/index.js", () => ({
  windowManager: {
    getMainWindow: () => mocked.mainWindow,
  },
}));

vi.mock("../../../src/main/services/features/syncService.js", () => ({
  syncService: {
    handleOAuthCallback: (...args: unknown[]) => mocked.handleOAuthCallback(...args),
    getStatus: () => mocked.status,
  },
}));

const getHashParams = (url: string): URLSearchParams => {
  const parsed = new URL(url);
  const hash = parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash;
  const queryStart = hash.indexOf("?");
  const query = queryStart >= 0 ? hash.slice(queryStart + 1) : "";
  return new URLSearchParams(query);
};

describe("deepLink OAuth callback routing", () => {
  beforeEach(() => {
    vi.resetModules();
    mocked.openExternal.mockReset();
    mocked.handleOAuthCallback.mockReset();
    mocked.mainWindow.isMinimized.mockReset();
    mocked.mainWindow.restore.mockReset();
    mocked.mainWindow.focus.mockReset();
    mocked.mainWindow.isMinimized.mockReturnValue(false);
    mocked.status.connected = false;
    mocked.status.mode = "idle";
  });

  it("treats stale callback as success when already connected", async () => {
    mocked.status.connected = true;
    mocked.handleOAuthCallback.mockRejectedValue(new Error("SYNC_AUTH_NO_PENDING_SESSION"));

    const { handleDeepLinkUrl } = await import("../../../src/main/lifecycle/deepLink.js");
    const handled = await handleDeepLinkUrl("luie://auth/callback?error=invalid_request");

    expect(handled).toBe(true);
    expect(mocked.openExternal).toHaveBeenCalledTimes(1);
    const url = String(mocked.openExternal.mock.calls[0]?.[0]);
    const params = getHashParams(url);
    expect(params.get("status")).toBe("success");
    expect(params.get("detail")).toBe("STALE_CONNECTED:NO_PENDING");
  });

  it("does not mask unknown callback failure as success", async () => {
    mocked.status.connected = true;
    mocked.handleOAuthCallback.mockRejectedValue(new Error("OAUTH_FLOW_BROKEN"));

    const { handleDeepLinkUrl } = await import("../../../src/main/lifecycle/deepLink.js");
    const handled = await handleDeepLinkUrl("luie://auth/callback?error=invalid_request");

    expect(handled).toBe(false);
    expect(mocked.openExternal).toHaveBeenCalledTimes(1);
    const url = String(mocked.openExternal.mock.calls[0]?.[0]);
    const params = getHashParams(url);
    expect(params.get("status")).toBe("error");
    expect(params.get("detail")).toContain("UNKNOWN:");
  });
});
