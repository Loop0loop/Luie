import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "../../../src/shared/constants/errorCode.js";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

const mocked = vi.hoisted(() => {
  const handlerMap = new Map<
    string,
    (event: unknown, ...args: unknown[]) => Promise<unknown>
  >();
  const syncService = {
    getStatus: vi.fn(),
    connectGoogle: vi.fn(),
    disconnect: vi.fn(),
    runNow: vi.fn(),
    setAutoSync: vi.fn(),
  };

  return {
    handlerMap,
    syncService,
    logger: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
  app: {
    quit: vi.fn(),
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
    createExportWindow: vi.fn(),
  },
}));

vi.mock("../../../src/main/services/features/syncService.js", () => ({
  syncService: mocked.syncService,
}));

describe("IPC input validation", () => {
  beforeEach(() => {
    mocked.handlerMap.clear();
    mocked.syncService.getStatus.mockReset();
    mocked.syncService.connectGoogle.mockReset();
    mocked.syncService.disconnect.mockReset();
    mocked.syncService.runNow.mockReset();
    mocked.syncService.setAutoSync.mockReset();
  });

  it("returns INVALID_INPUT for malformed WINDOW_SET_FULLSCREEN payload", async () => {
    const { registerWindowIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcWindowHandlers.js"
    );
    registerWindowIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.WINDOW_SET_FULLSCREEN);
    expect(handler).toBeDefined();

    const response = (await handler?.({}, "not-boolean")) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
  });

  it("returns INVALID_INPUT for malformed SYNC_SET_AUTO payload", async () => {
    const { registerSyncIPCHandlers } = await import(
      "../../../src/main/handler/system/ipcSyncHandlers.js"
    );
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_SET_AUTO);
    expect(handler).toBeDefined();

    const response = (await handler?.({}, {})) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.syncService.setAutoSync).not.toHaveBeenCalled();
  });
});
