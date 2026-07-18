import { beforeEach, describe, expect, it, vi } from "vitest";
import { IPC_CHANNELS } from "../../../src/shared/ipc/channels.js";

type BeforeQuitEvent = { preventDefault: () => void };
type BeforeQuitHandler = (event: BeforeQuitEvent) => void;

const mocked = vi.hoisted(() => ({
  beforeQuit: undefined as BeforeQuitHandler | undefined,
  flushComplete: undefined as
    | ((event: unknown, payload: unknown) => void)
    | undefined,
  dialogResponses: [] as number[],
  appExit: vi.fn(),
  appQuit: vi.fn(),
  dialog: vi.fn(async () => ({
    response: mocked.dialogResponses.shift() ?? 1,
  })),
  flushPendingExports: vi.fn(),
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
    send: vi.fn((channel: string) => {
      if (
        channel === IPC_CHANNELS.APP_BEFORE_QUIT &&
        mocked.flushComplete
      ) {
        const complete = mocked.flushComplete;
        mocked.flushComplete = undefined;
        complete({}, { hadQueuedAutoSaves: false, rendererDirty: false });
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
    once: vi.fn((_channel: string, handler: typeof mocked.flushComplete) => {
      mocked.flushComplete = handler;
    }),
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
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.beforeQuit = undefined;
    mocked.flushComplete = undefined;
    mocked.dialogResponses.length = 0;
    mocked.flushPendingExports.mockResolvedValue(flushResult(0));
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
