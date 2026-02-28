import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();
  const createExportWindow = vi.fn();
  const appQuit = vi.fn();
  const appGetVersion = vi.fn(() => "1.2.3-test");
  const appGetPath = vi.fn(() => `/tmp/luie-vitest-${process.pid}`);
  let appIsPackaged = false;
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };

  return {
    handlerMap,
    createExportWindow,
    appQuit,
    appGetVersion,
    appGetPath,
    get appIsPackaged() {
      return appIsPackaged;
    },
    set appIsPackaged(next: boolean) {
      appIsPackaged = next;
    },
    logger,
  };
});

vi.mock("electron", () => ({
  app: {
    quit: (...args: unknown[]) => mocked.appQuit(...args),
    getVersion: (...args: unknown[]) => mocked.appGetVersion(...args),
    getPath: (...args: unknown[]) => mocked.appGetPath(...args),
    get isPackaged() {
      return mocked.appIsPackaged;
    },
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
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

vi.mock("../../../src/main/manager/index.js", () => ({
  windowManager: {
    getMainWindow: () => null,
    createExportWindow: (...args: unknown[]) => mocked.createExportWindow(...args),
  },
}));

describe("ipcWindowHandlers", () => {
  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.createExportWindow.mockReset();
    mocked.appQuit.mockReset();
    mocked.appGetVersion.mockReset();
    mocked.appGetVersion.mockReturnValue("1.2.3-test");
    mocked.appGetPath.mockReset();
    mocked.appGetPath.mockReturnValue(`/tmp/luie-vitest-${process.pid}`);
    mocked.appIsPackaged = false;
    delete process.env.LUIE_UPDATE_FEED_URL;
    vi.unstubAllGlobals();
    mocked.logger.info.mockReset();
    mocked.logger.debug.mockReset();
    mocked.logger.error.mockReset();
  });

  it("returns boolean true when export window opens successfully", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.WINDOW_OPEN_EXPORT);
    expect(handler).toBeDefined();

    const response = await handler?.(
      {},
      "00000000-0000-4000-8000-000000000001",
    );
    const typed = response as {
      success: boolean;
      data?: boolean;
    };

    expect(typed.success).toBe(true);
    expect(typed.data).toBe(true);
    expect(mocked.createExportWindow).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("returns INVALID_INPUT response for malformed chapter id", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.WINDOW_OPEN_EXPORT);
    expect(handler).toBeDefined();

    const response = await handler?.({}, "not-a-uuid");
    const typed = response as {
      success: boolean;
      error?: { code: string };
    };

    expect(typed.success).toBe(false);
    expect(typed.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.createExportWindow).not.toHaveBeenCalled();
  });

  it("returns app version via APP_GET_VERSION", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_GET_VERSION);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { version?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.version).toBe("1.2.3-test");
  });

  it("returns safe disabled status for APP_CHECK_UPDATE in dev", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_CHECK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { status?: string; supported?: boolean; available?: boolean; currentVersion?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.status).toBe("disabled");
    expect(typed.data?.supported).toBe(false);
    expect(typed.data?.available).toBe(false);
    expect(typed.data?.currentVersion).toBe("1.2.3-test");
  });

  it("returns unconfigured status for packaged build without feed url", async () => {
    mocked.appIsPackaged = true;
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_CHECK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { status?: string; supported?: boolean; available?: boolean; message?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.status).toBe("unconfigured");
    expect(typed.data?.supported).toBe(false);
    expect(typed.data?.available).toBe(false);
    expect(typed.data?.message).toBe("UPDATE_FEED_URL_NOT_CONFIGURED");
  });

  it("returns available status when packaged feed has newer version", async () => {
    mocked.appIsPackaged = true;
    process.env.LUIE_UPDATE_FEED_URL = "https://updates.example.com/latest.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
        },
        text: async () => JSON.stringify({ version: "1.3.0" }),
      })),
    );

    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_CHECK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: {
        status?: string;
        supported?: boolean;
        available?: boolean;
        latestVersion?: string;
      };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.status).toBe("available");
    expect(typed.data?.supported).toBe(true);
    expect(typed.data?.available).toBe(true);
    expect(typed.data?.latestVersion).toBe("1.3.0");
  });

  it("returns up-to-date status when packaged feed has same version", async () => {
    mocked.appIsPackaged = true;
    process.env.LUIE_UPDATE_FEED_URL = "https://updates.example.com/latest.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
        },
        text: async () => JSON.stringify({ tag_name: "v1.2.3-test" }),
      })),
    );

    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_CHECK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { status?: string; available?: boolean; latestVersion?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.status).toBe("up-to-date");
    expect(typed.data?.available).toBe(false);
    expect(typed.data?.latestVersion).toBe("1.2.3-test");
  });

  it("returns error when packaged feed url is insecure", async () => {
    mocked.appIsPackaged = true;
    process.env.LUIE_UPDATE_FEED_URL = "http://updates.example.com/latest.json";

    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_CHECK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { status?: string; message?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.status).toBe("error");
    expect(typed.data?.message).toBe("UPDATE_FEED_URL_INSECURE");
  });

  it("returns error when packaged feed request fails", async () => {
    mocked.appIsPackaged = true;
    process.env.LUIE_UPDATE_FEED_URL = "https://updates.example.com/latest.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_CHECK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { status?: string; message?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.status).toBe("error");
    expect(typed.data?.message).toContain("UPDATE_CHECK_FAILED");
  });

  it("returns update state via APP_GET_UPDATE_STATE", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_GET_UPDATE_STATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { currentVersion?: string; rollbackAvailable?: boolean };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.currentVersion).toBe("1.2.3-test");
    expect(typeof typed.data?.rollbackAvailable).toBe("boolean");
  });

  it("returns disabled response for APP_DOWNLOAD_UPDATE in dev", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_DOWNLOAD_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { success?: boolean; message?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.success).toBe(false);
    expect(typed.data?.message).toBe("UPDATE_DOWNLOAD_DISABLED_IN_DEV");
  });

  it("returns disabled response for APP_APPLY_UPDATE in dev", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_APPLY_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { success?: boolean; message?: string; relaunched?: boolean };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.success).toBe(false);
    expect(typed.data?.message).toBe("UPDATE_APPLY_DISABLED_IN_DEV");
    expect(typed.data?.relaunched).toBe(false);
  });

  it("returns not available response for APP_ROLLBACK_UPDATE without rollback data", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.APP_ROLLBACK_UPDATE);
    expect(handler).toBeDefined();

    const response = await handler?.({});
    const typed = response as {
      success: boolean;
      data?: { success?: boolean; message?: string };
    };

    expect(typed.success).toBe(true);
    expect(typed.data?.success).toBe(false);
    expect(typed.data?.message).toBe("UPDATE_ROLLBACK_NOT_AVAILABLE");
  });
});
