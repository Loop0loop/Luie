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
  const logger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };

  return {
    handlerMap,
    createExportWindow,
    appQuit,
    logger,
  };
});

vi.mock("electron", () => ({
  app: {
    quit: (...args: unknown[]) => mocked.appQuit(...args),
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
});
