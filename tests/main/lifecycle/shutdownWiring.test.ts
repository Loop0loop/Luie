import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";
import {
  QUIT_RENDERER_FLUSH_TIMEOUT_MS,
  QUIT_SAVE_TIMEOUT_MS,
} from "../../../src/shared/constants/index.js";

type BeforeQuitEvent = { preventDefault: () => void };
type BeforeQuitHandler = (event: BeforeQuitEvent) => void;

const mocked = vi.hoisted(() => ({
  beforeQuit: undefined as BeforeQuitHandler | undefined,
  flushComplete: undefined as
    | ((event: unknown, payload: unknown) => void)
    | undefined,
  dialogResponses: [] as number[],
  rendererFlushPayloads: [] as Array<
    | {
        requestId?: string;
        hadQueuedAutoSaves: boolean;
        rendererDirty: boolean;
      }
    | Error
    | null
  >,
  appExit: vi.fn(),
  appQuit: vi.fn(),
  dialog: vi.fn(async () => ({
    response: mocked.dialogResponses.shift() ?? 1,
  })),
  flushPendingExports: vi.fn(),
  ipcRemoveListener: vi.fn(
    (_channel: string, handler: typeof mocked.flushComplete) => {
      if (mocked.flushComplete === handler) mocked.flushComplete = undefined;
    },
  ),
  rendererFlushRequestIds: [] as string[],
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

const autoSaveManager = {
  flushCritical: vi.fn(async () => ({ mirrored: 0 })),
  getPendingSaveCount: vi.fn(() => 0),
  flushAll: vi.fn(async () => undefined),
  flushMirrorsToSnapshots: vi.fn(async () => undefined),
};

const mainWindow = {
  isDestroyed: vi.fn(() => false),
  webContents: {
    send: vi.fn((channel: string, request?: { requestId?: string }) => {
      if (
        channel === IPC_CHANNELS.APP_BEFORE_QUIT &&
        mocked.flushComplete
      ) {
        if (request?.requestId) {
          mocked.rendererFlushRequestIds.push(request.requestId);
        }
        const payload = mocked.rendererFlushPayloads.length
          ? mocked.rendererFlushPayloads.shift()
          : {
              hadQueuedAutoSaves: false,
              rendererDirty: false,
            };
        if (!payload) return;
        if (payload instanceof Error) throw payload;
        const complete = mocked.flushComplete;
        complete({ sender: mainWindow.webContents }, {
          ...payload,
          requestId: payload.requestId ?? request?.requestId,
        });
      }
    }),
  },
};

vi.mock("electron", () => ({
  app: {
    on: vi.fn((event: string, handler: BeforeQuitHandler) => {
      if (event === "before-quit") mocked.beforeQuit = handler;
    }),
    quit: mocked.appQuit,
    exit: mocked.appExit,
  },
  ipcMain: {
    on: vi.fn((_channel: string, handler: typeof mocked.flushComplete) => {
      mocked.flushComplete = handler;
    }),
    removeListener: mocked.ipcRemoveListener,
  },
  dialog: {
    showMessageBox: mocked.dialog,
  },
}));

vi.mock("../../../src/main/app/windows/index.js", () => ({
  windowManager: { getMainWindow: vi.fn(() => mainWindow) },
}));

vi.mock("../../../src/main/infra/database/index.js", () => ({
  db: {
    runWalCheckpoint: vi.fn(() => ({})),
    disconnect: vi.fn(async () => undefined),
  },
}));

vi.mock("../../../src/main/infra/database/cache.js", () => ({
  cacheDb: {
    runWalCheckpoint: vi.fn(() => ({})),
    disconnect: vi.fn(async () => undefined),
  },
}));

vi.mock("../../../src/main/domains/project/index.js", () => ({
  projectService: {
    flushPendingExports: mocked.flushPendingExports,
  },
}));

vi.mock("../../../src/main/domains/recovery/index.js", () => ({
  snapshotService: {
    pruneSnapshotsAllProjects: vi.fn(async () => undefined),
  },
}));

vi.mock("../../../src/main/domains/manuscript/index.js", () => ({
  autoSaveManager,
  derivedJobWorker: { stop: vi.fn(async () => undefined) },
}));

vi.mock("../../../src/main/domains/settings/llm.js", () => ({
  sidecarManager: { stop: vi.fn(async () => undefined) },
}));

import { registerShutdownHandlers } from "../../../src/main/lifecycle/shutdown/shutdown.js";

const flushResult = (failed: number, timedOut = false) => ({
  total: 1,
  flushed: failed > 0 ? 0 : 1,
  failed,
  timedOut,
});

const triggerBeforeQuit = () => {
  const event = { preventDefault: vi.fn() };
  expect(mocked.beforeQuit).toBeTypeOf("function");
  mocked.beforeQuit?.(event);
  expect(event.preventDefault).toHaveBeenCalledOnce();
};

describe("shutdown export decision wiring", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.mocked(process.on).mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "on").mockImplementation(() => process);
    mocked.beforeQuit = undefined;
    mocked.flushComplete = undefined;
    mocked.dialogResponses.length = 0;
    mocked.rendererFlushPayloads.length = 0;
    mocked.rendererFlushRequestIds.length = 0;
    mocked.flushPendingExports.mockResolvedValue(flushResult(0));
    autoSaveManager.getPendingSaveCount.mockReturnValue(0);
    autoSaveManager.flushAll.mockResolvedValue(undefined);
    registerShutdownHandlers({
      info: mocked.loggerInfo,
      warn: mocked.loggerWarn,
      error: mocked.loggerError,
    } as never);
  });

  it("does not exit on soft failure cancel and allows a second quit attempt", async () => {
    mocked.flushPendingExports
      .mockResolvedValueOnce(flushResult(1))
      .mockResolvedValueOnce(flushResult(0));
    mocked.dialogResponses.push(1);

    triggerBeforeQuit();
    await vi.waitFor(() =>
      expect(mocked.loggerInfo).toHaveBeenCalledWith(
        "Quit cancelled by user during export flush",
      ),
    );
    expect(mocked.appExit).not.toHaveBeenCalled();

    triggerBeforeQuit();
    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
  });

  it("finalizes once when the hard retry succeeds", async () => {
    mocked.flushPendingExports
      .mockResolvedValueOnce(flushResult(1))
      .mockResolvedValueOnce(flushResult(0));
    mocked.dialogResponses.push(0);

    triggerBeforeQuit();

    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
    expect(mocked.flushPendingExports).toHaveBeenCalledTimes(2);
  });

  it("finalizes once after an explicit soft skip", async () => {
    mocked.flushPendingExports.mockResolvedValueOnce(flushResult(1));
    mocked.dialogResponses.push(2);

    triggerBeforeQuit();

    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
    expect(mocked.flushPendingExports).toHaveBeenCalledOnce();
  });

  it("requests renderer flush again before save-and-quit can finalize", async () => {
    mocked.rendererFlushPayloads.push(
      { hadQueuedAutoSaves: true, rendererDirty: true },
      { hadQueuedAutoSaves: true, rendererDirty: false },
    );
    mocked.dialogResponses.push(0);

    triggerBeforeQuit();

    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
    expect(
      mainWindow.webContents.send.mock.calls.filter(
        ([channel]) => channel === IPC_CHANNELS.APP_BEFORE_QUIT,
      ),
    ).toHaveLength(2);
    expect(mocked.flushComplete).toBeUndefined();
  });

  it("does not accept a late ACK from the first attempt as the second ACK", async () => {
    vi.useFakeTimers();
    mocked.rendererFlushPayloads.push(null, null);
    mocked.dialogResponses.push(0);

    triggerBeforeQuit();
    await vi.advanceTimersByTimeAsync(QUIT_RENDERER_FLUSH_TIMEOUT_MS);
    await vi.runAllTicks();
    vi.useRealTimers();

    expect(mocked.rendererFlushRequestIds).toHaveLength(2);
    const [firstRequestId, secondRequestId] = mocked.rendererFlushRequestIds;
    expect(firstRequestId).not.toBe(secondRequestId);

    mocked.flushComplete?.({ sender: mainWindow.webContents }, {
      requestId: firstRequestId,
      hadQueuedAutoSaves: true,
      rendererDirty: false,
    });
    expect(mocked.flushComplete).toBeTypeOf("function");
    expect(mocked.appExit).not.toHaveBeenCalled();

    mocked.flushComplete?.({ sender: mainWindow.webContents }, {
      requestId: secondRequestId,
      hadQueuedAutoSaves: true,
      rendererDirty: false,
    });
    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
  });

  it("ignores foreign and malformed renderer flush ACKs", async () => {
    mocked.rendererFlushPayloads.push(null);

    triggerBeforeQuit();
    await vi.waitFor(() =>
      expect(mocked.rendererFlushRequestIds).toHaveLength(1),
    );
    const [requestId] = mocked.rendererFlushRequestIds;

    mocked.flushComplete?.({ sender: {} }, {
      requestId,
      hadQueuedAutoSaves: false,
      rendererDirty: false,
    });
    mocked.flushComplete?.({ sender: mainWindow.webContents }, {
      requestId,
      hadQueuedAutoSaves: "false",
      rendererDirty: false,
    });

    expect(mocked.flushComplete).toBeTypeOf("function");
    expect(mocked.appExit).not.toHaveBeenCalled();

    mocked.flushComplete?.({ sender: mainWindow.webContents }, {
      requestId,
      hadQueuedAutoSaves: false,
      rendererDirty: false,
    });
    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
  });

  it("cancels quit by default when the renderer retry remains dirty", async () => {
    mocked.rendererFlushPayloads.push(
      { hadQueuedAutoSaves: true, rendererDirty: true },
      { hadQueuedAutoSaves: true, rendererDirty: true },
    );
    mocked.dialogResponses.push(0, 2);

    triggerBeforeQuit();

    await vi.waitFor(() =>
      expect(mocked.loggerInfo).toHaveBeenCalledWith(
        "Quit cancelled by user during renderer flush retry",
      ),
    );
    expect(mocked.dialog).toHaveBeenCalledTimes(2);
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it("allows quitting without renderer ACK only after an explicit skip", async () => {
    mocked.rendererFlushPayloads.push(
      { hadQueuedAutoSaves: true, rendererDirty: true },
      { hadQueuedAutoSaves: true, rendererDirty: true },
    );
    mocked.dialogResponses.push(0, 1);

    triggerBeforeQuit();

    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
    expect(mocked.dialog).toHaveBeenCalledTimes(2);
    expect(autoSaveManager.flushAll).not.toHaveBeenCalled();
  });

  it("cancels quit and removes the listener when the renderer retry times out", async () => {
    vi.useFakeTimers();
    mocked.rendererFlushPayloads.push(
      { hadQueuedAutoSaves: true, rendererDirty: true },
      null,
    );
    mocked.dialogResponses.push(0, 2);

    triggerBeforeQuit();
    await vi.advanceTimersByTimeAsync(QUIT_RENDERER_FLUSH_TIMEOUT_MS);
    await vi.runAllTicks();

    expect(mocked.loggerInfo).toHaveBeenCalledWith(
      "Quit cancelled by user during renderer flush retry",
    );
    expect(mocked.flushComplete).toBeUndefined();
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it("cancels quit and removes the listener when the renderer retry send throws", async () => {
    mocked.rendererFlushPayloads.push(
      { hadQueuedAutoSaves: true, rendererDirty: true },
      new Error("renderer unavailable"),
    );
    mocked.dialogResponses.push(0, 2);

    triggerBeforeQuit();

    await vi.waitFor(() =>
      expect(mocked.loggerInfo).toHaveBeenCalledWith(
        "Quit cancelled by user during renderer flush retry",
      ),
    );
    expect(mocked.flushComplete).toBeUndefined();
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it("removes the renderer flush listener when the handshake times out", async () => {
    vi.useFakeTimers();
    mocked.rendererFlushPayloads.push(null);
    mocked.dialogResponses.push(2);

    triggerBeforeQuit();
    await vi.advanceTimersByTimeAsync(QUIT_RENDERER_FLUSH_TIMEOUT_MS);
    await vi.runAllTicks();

    expect(mocked.flushComplete).toBeUndefined();
    expect(mocked.ipcRemoveListener).toHaveBeenCalled();
  });

  it("cancels quit when the unsaved-changes dialog fails without renderer ACK", async () => {
    vi.useFakeTimers();
    mocked.rendererFlushPayloads.push(null);
    mocked.dialog.mockRejectedValueOnce(new Error("dialog unavailable"));

    triggerBeforeQuit();
    await vi.advanceTimersByTimeAsync(QUIT_RENDERER_FLUSH_TIMEOUT_MS);
    await vi.runAllTicks();

    expect(mocked.loggerInfo).toHaveBeenCalledWith(
      "Quit cancelled because unsaved changes dialog failed",
    );
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it("cancels quit by default when save-and-quit persistence rejects", async () => {
    autoSaveManager.getPendingSaveCount.mockReturnValue(1);
    autoSaveManager.flushAll.mockRejectedValueOnce(new Error("save failed"));
    mocked.dialogResponses.push(0, 2);

    triggerBeforeQuit();

    await vi.waitFor(() =>
      expect(mocked.loggerInfo).toHaveBeenCalledWith(
        "Quit cancelled by user during main save retry",
      ),
    );
    expect(mocked.dialog).toHaveBeenCalledTimes(2);
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it("cancels quit by default when save-and-quit persistence times out", async () => {
    vi.useFakeTimers();
    autoSaveManager.getPendingSaveCount.mockReturnValue(1);
    autoSaveManager.flushAll.mockImplementationOnce(
      () => new Promise<void>(() => undefined),
    );
    mocked.dialogResponses.push(0, 2);

    triggerBeforeQuit();
    await vi.advanceTimersByTimeAsync(QUIT_SAVE_TIMEOUT_MS);
    await vi.runAllTicks();

    expect(mocked.loggerInfo).toHaveBeenCalledWith(
      "Quit cancelled by user during main save retry",
    );
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it("retries rejected save-and-quit persistence before finalizing", async () => {
    autoSaveManager.getPendingSaveCount.mockReturnValue(1);
    autoSaveManager.flushAll
      .mockRejectedValueOnce(new Error("save failed"))
      .mockResolvedValueOnce(undefined);
    mocked.dialogResponses.push(0, 0);

    triggerBeforeQuit();

    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
    expect(autoSaveManager.flushAll).toHaveBeenCalledTimes(2);
  });

  it("finalizes after explicitly skipping rejected save-and-quit persistence", async () => {
    autoSaveManager.getPendingSaveCount.mockReturnValue(1);
    autoSaveManager.flushAll.mockRejectedValueOnce(new Error("save failed"));
    mocked.dialogResponses.push(0, 1);

    triggerBeforeQuit();

    await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
    expect(autoSaveManager.flushAll).toHaveBeenCalledOnce();
  });

  it.each([
    ["failure", flushResult(1)],
    ["timeout", flushResult(0, true)],
  ])("does not exit when the hard retry ends in %s", async (_label, hardResult) => {
    mocked.flushPendingExports
      .mockResolvedValueOnce(flushResult(1))
      .mockResolvedValueOnce(hardResult);
    mocked.dialogResponses.push(0, 0);

    triggerBeforeQuit();

    await vi.waitFor(() =>
      expect(mocked.loggerInfo).toHaveBeenCalledWith(
        "Quit cancelled by user during export flush",
      ),
    );
    expect(mocked.dialog).toHaveBeenCalledTimes(2);
    expect(mocked.appExit).not.toHaveBeenCalled();
  });

  it.each([
    ["failure", flushResult(1)],
    ["timeout", flushResult(0, true)],
  ])(
    "finalizes once after explicitly skipping a hard retry %s",
    async (_label, hardResult) => {
      mocked.flushPendingExports
        .mockResolvedValueOnce(flushResult(1))
        .mockResolvedValueOnce(hardResult);
      mocked.dialogResponses.push(0, 1);

      triggerBeforeQuit();

      await vi.waitFor(() => expect(mocked.appExit).toHaveBeenCalledOnce());
      expect(mocked.dialog).toHaveBeenCalledTimes(2);
      expect(mocked.flushPendingExports).toHaveBeenCalledTimes(2);
    },
  );
});
