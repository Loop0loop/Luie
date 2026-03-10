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
    resolveConflict: vi.fn(),
  };

  return {
    handlerMap,
    syncService,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
    },
  };
});

vi.mock("electron", () => ({
  app: {
    quit: vi.fn(),
    getVersion: vi.fn(() => "0.0.0-test"),
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

vi.mock("../../../src/main/services/features/sync/syncService.js", () => ({
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
    mocked.syncService.resolveConflict.mockReset();
    mocked.logger.warn.mockReset();
  });

  it("returns INVALID_INPUT for malformed WINDOW_SET_FULLSCREEN payload", async () => {
    const { registerWindowIPCHandlers } =
      await import("../../../src/main/handler/system/ipcWindowHandlers.js");
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
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
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
    expect(mocked.logger.warn).toHaveBeenCalledWith(
      "IPC request rejected by schema validation",
      expect.objectContaining({
        scope: "ipc-handler",
        domain: "ipc",
        event: "validation.failed",
      }),
    );
  });

  it("returns INVALID_INPUT for SYNC_SET_AUTO payload with extra keys", async () => {
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_SET_AUTO);
    expect(handler).toBeDefined();

    const response = (await handler?.({}, { enabled: true, extra: true })) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.syncService.setAutoSync).not.toHaveBeenCalled();
  });

  it("returns INVALID_INPUT for malformed SYNC_RESOLVE_CONFLICT payload", async () => {
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_RESOLVE_CONFLICT);
    expect(handler).toBeDefined();

    const response = (await handler?.(
      {},
      { type: "chapter", id: "", resolution: "local" },
    )) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.syncService.resolveConflict).not.toHaveBeenCalled();
  });

  it("passes valid SYNC_RESOLVE_CONFLICT payload to syncService", async () => {
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
    mocked.syncService.resolveConflict.mockResolvedValue(undefined);
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_RESOLVE_CONFLICT);
    expect(handler).toBeDefined();

    const payload = {
      type: "memo",
      id: "memo-1",
      resolution: "remote",
    } as const;
    const response = (await handler?.({}, payload)) as {
      success: boolean;
    };

    expect(response.success).toBe(true);
    expect(mocked.syncService.resolveConflict).toHaveBeenCalledWith(payload);
  });

  it("returns INVALID_INPUT for SYNC_RESOLVE_CONFLICT payload with extra keys", async () => {
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_RESOLVE_CONFLICT);
    expect(handler).toBeDefined();

    const response = (await handler?.(
      {},
      {
        type: "memo",
        id: "memo-1",
        resolution: "remote",
        extra: true,
      },
    )) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
    expect(mocked.syncService.resolveConflict).not.toHaveBeenCalled();
  });

  it("returns INVALID_INPUT for malformed SYNC_SET_RUNTIME_CONFIG payload", async () => {
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_SET_RUNTIME_CONFIG);
    expect(handler).toBeDefined();

    const response = (await handler?.({}, { url: "", anonKey: "" })) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
  });

  it("returns INVALID_INPUT for SYNC_SET_RUNTIME_CONFIG payload with extra keys", async () => {
    const { registerSyncIPCHandlers } =
      await import("../../../src/main/handler/system/ipcSyncHandlers.js");
    registerSyncIPCHandlers(mocked.logger);

    const handler = mocked.handlerMap.get(IPC_CHANNELS.SYNC_SET_RUNTIME_CONFIG);
    expect(handler).toBeDefined();

    const response = (await handler?.(
      {},
      {
        url: "https://example.supabase.co",
        anonKey: "1234567890abcdef",
        extra: true,
      },
    )) as {
      success: boolean;
      error?: { code: string };
    };

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe(ErrorCode.INVALID_INPUT);
  });
});
