import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();

  const baseSettings = {
    editor: {
      fontFamily: "system-ui",
      fontSize: 16,
      lineHeight: 1.5,
      maxWidth: 700,
      theme: "light",
      themeTemp: "neutral",
      themeContrast: "soft",
      themeAccent: "blue",
      themeTexture: "none",
      uiMode: "default",
    },
    autoSaveEnabled: true,
    autoSaveInterval: 30000,
    sync: {
      connected: true,
      autoSync: true,
      accessTokenCipher: "secret-access",
      refreshTokenCipher: "secret-refresh",
      pendingAuthState: "secret-state",
      pendingAuthVerifierCipher: "secret-verifier",
      pendingAuthCreatedAt: new Date().toISOString(),
    },
  };

  const settingsManager = {
    getAll: vi.fn(() => baseSettings),
    getAllForRenderer: vi.fn(() => ({
      ...baseSettings,
      sync: {
        connected: true,
        autoSync: true,
      },
    })),
    getEditorSettings: vi.fn(() => baseSettings.editor),
    setEditorSettings: vi.fn(),
    getAutoSaveEnabled: vi.fn(() => true),
    getAutoSaveInterval: vi.fn(() => 30000),
    getLanguage: vi.fn(() => "ko"),
    setLanguage: vi.fn(),
    getMenuBarMode: vi.fn(() => "visible"),
    setMenuBarMode: vi.fn(),
    getShortcuts: vi.fn(() => ({ shortcuts: {}, defaults: {} })),
    setShortcuts: vi.fn(() => ({})),
    setAutoSaveEnabled: vi.fn(),
    setAutoSaveInterval: vi.fn(),
    setWindowBounds: vi.fn(),
    getWindowBounds: vi.fn(() => undefined),
    resetToDefaults: vi.fn(),
  };

  return {
    handlerMap,
    settingsManager,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
  ipcMain: {
    handle: vi.fn(
      (
        channel: string,
        handler: (event: unknown, ...args: unknown[]) => Promise<unknown>,
      ) => {
        mocked.handlerMap.set(channel, handler);
      },
    ),
  },
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: mocked.settingsManager,
}));

vi.mock("../../../src/main/lifecycle/menu.js", () => ({
  applyApplicationMenu: vi.fn(),
}));

describe("ipcSettingsHandlers security", () => {
  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.settingsManager.getAll.mockClear();
    mocked.settingsManager.getAllForRenderer.mockClear();
    mocked.settingsManager.resetToDefaults.mockClear();
  });

  it("returns renderer-safe settings for SETTINGS_GET_ALL", async () => {
    const { registerSettingsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcSettingsHandlers.js"
    );
    registerSettingsIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SETTINGS_GET_ALL);
    expect(handler).toBeDefined();

    const response = (await handler?.({})) as {
      success: boolean;
      data?: {
        sync?: {
          accessTokenCipher?: string;
          refreshTokenCipher?: string;
          pendingAuthVerifierCipher?: string;
        };
      };
    };

    expect(response.success).toBe(true);
    expect(mocked.settingsManager.getAllForRenderer).toHaveBeenCalledTimes(1);
    expect(mocked.settingsManager.getAll).not.toHaveBeenCalled();
    expect(response.data?.sync?.accessTokenCipher).toBeUndefined();
    expect(response.data?.sync?.refreshTokenCipher).toBeUndefined();
    expect(response.data?.sync?.pendingAuthVerifierCipher).toBeUndefined();
  });

  it("returns renderer-safe settings after SETTINGS_RESET", async () => {
    const { registerSettingsIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcSettingsHandlers.js"
    );
    registerSettingsIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SETTINGS_RESET);
    expect(handler).toBeDefined();

    const response = (await handler?.({})) as { success: boolean };
    expect(response.success).toBe(true);
    expect(mocked.settingsManager.resetToDefaults).toHaveBeenCalledTimes(1);
    expect(mocked.settingsManager.getAllForRenderer).toHaveBeenCalledTimes(1);
    expect(mocked.settingsManager.getAll).not.toHaveBeenCalled();
  });
});
