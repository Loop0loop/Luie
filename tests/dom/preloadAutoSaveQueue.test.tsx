// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: preload autosave 실패는 retry 가능 상태를 유지하고 잘못된 save 확인을 막는다.

import type { RendererApi } from "../../src/shared/api/index.js";
import { IPC_CHANNELS } from "../../src/shared/ipc/channels.js";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  api: undefined as RendererApi | undefined,
  invoke: vi.fn(),
  send: vi.fn(),
}));

vi.mock("electron", () => ({
  contextBridge: {
    exposeInMainWorld: (_name: string, api: RendererApi) => {
      mocked.api = api;
    },
  },
  ipcRenderer: {
    invoke: mocked.invoke,
    send: mocked.send,
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

const success = { success: true } as const;
const failure = {
  success: false,
  error: { code: "WRITE_FAILED", message: "disk full" },
} as const;

describe("preload autosave queue", () => {
  beforeAll(async () => {
    await import("../../src/preload/index.js");
  });

  beforeEach(() => {
    vi.useRealTimers();
    mocked.invoke.mockReset().mockResolvedValue(success);
    mocked.send.mockReset();
  });

  it("preserves a failed payload for retry and blocks manual save IPC", async () => {
    const api = mocked.api!;
    mocked.invoke.mockImplementation(async (channel: string) =>
      channel === IPC_CHANNELS.AUTO_SAVE ? failure : success,
    );
    const queued = api.autoSave("chapter-failed", "latest", "project-failed");
    const queuedResult = queued.catch((error: unknown) => error);

    await expect(api.app.manualSave("project-failed")).rejects.toThrow(
      "disk full",
    );
    expect(await queuedResult).toBeInstanceOf(Error);
    expect(mocked.invoke).not.toHaveBeenCalledWith(
      IPC_CHANNELS.MANUAL_SAVE,
      "project-failed",
    );

    mocked.invoke.mockResolvedValue(success);
    await expect(api.app.manualSave("project-failed")).resolves.toEqual(success);
    expect(mocked.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.AUTO_SAVE,
      "chapter-failed",
      "latest",
      "project-failed",
    );
    expect(mocked.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.MANUAL_SAVE,
      "project-failed",
    );
  });

  it("preserves an autosave when the IPC invocation throws", async () => {
    const api = mocked.api!;
    mocked.invoke.mockImplementation(async (channel: string) => {
      if (channel === IPC_CHANNELS.AUTO_SAVE) throw new Error("ipc crashed");
      return success;
    });
    const queuedResult = api
      .autoSave("chapter-throw", "latest", "project-throw")
      .catch((error: unknown) => error);

    await expect(api.app.manualSave("project-throw")).rejects.toThrow(
      "ipc crashed",
    );
    expect(await queuedResult).toBeInstanceOf(Error);
    expect(mocked.invoke).not.toHaveBeenCalledWith(
      IPC_CHANNELS.MANUAL_SAVE,
      "project-throw",
    );

    mocked.invoke.mockResolvedValue(success);
    await api.app.manualSave("project-throw");
    expect(mocked.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.AUTO_SAVE,
      "chapter-throw",
      "latest",
      "project-throw",
    );
  });

  it("keeps a newer same-key payload when an in-flight payload fails", async () => {
    const api = mocked.api!;
    let finishFirstSave: ((value: typeof failure) => void) | undefined;
    mocked.invoke.mockImplementation(
      (channel: string, _chapterId: string, content: string) => {
        if (channel !== IPC_CHANNELS.AUTO_SAVE) return Promise.resolve(success);
        if (content === "old") {
          return new Promise<typeof failure>((resolve) => {
            finishFirstSave = resolve;
          });
        }
        return Promise.resolve(success);
      },
    );

    const oldSave = api.autoSave("chapter-race", "old", "project-race");
    const oldResult = oldSave.catch((error: unknown) => error);
    const firstManualSave = api.app.manualSave("project-race");
    await vi.waitFor(() => expect(finishFirstSave).toBeTypeOf("function"));

    const latestSave = api.autoSave("chapter-race", "latest", "project-race");
    finishFirstSave!(failure);

    await expect(firstManualSave).rejects.toThrow("disk full");
    expect(await oldResult).toBeInstanceOf(Error);
    await expect(api.app.manualSave("project-race")).resolves.toEqual(success);
    await expect(latestSave).resolves.toEqual(success);

    const autoSaveContents = mocked.invoke.mock.calls
      .filter(([channel]) => channel === IPC_CHANNELS.AUTO_SAVE)
      .map(([, , content]) => content);
    expect(autoSaveContents).toEqual(["old", "latest"]);
  });

  it("serializes a newer same-key flush behind an older in-flight flush", async () => {
    const api = mocked.api!;
    let finishOldSave: ((value: typeof failure) => void) | undefined;
    mocked.invoke.mockImplementation(
      (channel: string, _chapterId: string, content: string) => {
        if (channel !== IPC_CHANNELS.AUTO_SAVE) return Promise.resolve(success);
        if (content === "old" && !finishOldSave) {
          return new Promise<typeof failure>((resolve) => {
            finishOldSave = resolve;
          });
        }
        return Promise.resolve(success);
      },
    );

    const oldResult = api
      .autoSave("chapter-overlap", "old", "project-overlap")
      .catch((error: unknown) => error);
    const oldFlush = api.app.manualSave("project-overlap");
    await vi.waitFor(() => expect(finishOldSave).toBeTypeOf("function"));

    const latestSave = api.autoSave(
      "chapter-overlap",
      "latest",
      "project-overlap",
    );
    const latestFlush = api.app.manualSave("project-overlap");
    expect(mocked.invoke).not.toHaveBeenCalledWith(
      IPC_CHANNELS.AUTO_SAVE,
      "chapter-overlap",
      "latest",
      "project-overlap",
    );
    finishOldSave!(failure);
    await expect(oldFlush).rejects.toThrow("disk full");
    expect(await oldResult).toBeInstanceOf(Error);
    await latestFlush;
    await expect(latestSave).resolves.toEqual(success);

    await api.app.manualSave("project-overlap");
    const autoSaveContents = mocked.invoke.mock.calls
      .filter(([channel]) => channel === IPC_CHANNELS.AUTO_SAVE)
      .map(([, , content]) => content);
    expect(autoSaveContents).toEqual(["old", "latest"]);
  });

  it("does not let a second app flush acknowledge an in-flight first flush", async () => {
    const api = mocked.api!;
    let finishFirstSave: ((value: typeof failure) => void) | undefined;
    let autoSaveAttempts = 0;
    mocked.invoke.mockImplementation((channel: string) => {
      if (channel !== IPC_CHANNELS.AUTO_SAVE) return Promise.resolve(success);
      autoSaveAttempts += 1;
      if (autoSaveAttempts === 1) {
        return new Promise<typeof failure>((resolve) => {
          finishFirstSave = resolve;
        });
      }
      return Promise.resolve(success);
    });
    const queuedResult = api
      .autoSave("chapter-quit-race", "latest", "project-quit-race")
      .catch((error: unknown) => error);

    const firstFlush = api.lifecycle.completeFlush("quit-race-a");
    await vi.waitFor(() => expect(finishFirstSave).toBeTypeOf("function"));
    const secondFlush = api.lifecycle.completeFlush("quit-race-b");
    await Promise.resolve();

    expect(mocked.send).not.toHaveBeenCalledWith(
      IPC_CHANNELS.APP_FLUSH_COMPLETE,
      expect.anything(),
    );
    finishFirstSave!(failure);
    await expect(firstFlush).rejects.toThrow("disk full");
    expect(await queuedResult).toBeInstanceOf(Error);
    await secondFlush;

    expect(autoSaveAttempts).toBe(2);
    expect(mocked.send).toHaveBeenCalledTimes(1);
    expect(mocked.send).toHaveBeenCalledWith(IPC_CHANNELS.APP_FLUSH_COMPLETE, {
      requestId: "quit-race-b",
      hadQueuedAutoSaves: false,
      rendererDirty: false,
    });
  });

  it("drains a same-key payload enqueued during the original manual barrier", async () => {
    const api = mocked.api!;
    let finishOldSave: ((value: typeof success) => void) | undefined;
    let finishLatestSave: ((value: typeof success) => void) | undefined;
    mocked.invoke.mockImplementation(
      (channel: string, _chapterId: string, content: string) => {
        if (channel !== IPC_CHANNELS.AUTO_SAVE) return Promise.resolve(success);
        return new Promise<typeof success>((resolve) => {
          if (content === "old") finishOldSave = resolve;
          else finishLatestSave = resolve;
        });
      },
    );
    const oldSave = api.autoSave("chapter-barrier", "old", "project-barrier");
    const manualBarrier = api.app.manualSave("project-barrier");
    await vi.waitFor(() => expect(finishOldSave).toBeTypeOf("function"));
    const latestSave = api.autoSave(
      "chapter-barrier",
      "latest",
      "project-barrier",
    );

    finishOldSave!(success);
    await vi.waitFor(() => expect(finishLatestSave).toBeTypeOf("function"));
    expect(mocked.invoke).not.toHaveBeenCalledWith(
      IPC_CHANNELS.MANUAL_SAVE,
      "project-barrier",
    );
    finishLatestSave!(success);

    await expect(manualBarrier).resolves.toEqual(success);
    await expect(oldSave).resolves.toEqual(success);
    await expect(latestSave).resolves.toEqual(success);
    expect(mocked.invoke.mock.calls.map(([channel]) => channel)).toEqual([
      IPC_CHANNELS.AUTO_SAVE,
      IPC_CHANNELS.AUTO_SAVE,
      IPC_CHANNELS.MANUAL_SAVE,
    ]);
  });

  it("drains a payload enqueued during the original app flush before ACK", async () => {
    const api = mocked.api!;
    let finishOldSave: ((value: typeof success) => void) | undefined;
    let finishLatestSave: ((value: typeof success) => void) | undefined;
    mocked.invoke.mockImplementation(
      (channel: string, _chapterId: string, content: string) => {
        if (channel !== IPC_CHANNELS.AUTO_SAVE) return Promise.resolve(success);
        return new Promise<typeof success>((resolve) => {
          if (content === "old") finishOldSave = resolve;
          else finishLatestSave = resolve;
        });
      },
    );
    const oldSave = api.autoSave("chapter-ack-barrier", "old", "project-ack");
    const appBarrier = api.lifecycle.completeFlush("quit-barrier");
    await vi.waitFor(() => expect(finishOldSave).toBeTypeOf("function"));
    const latestSave = api.autoSave(
      "chapter-ack-barrier",
      "latest",
      "project-ack",
    );

    finishOldSave!(success);
    await vi.waitFor(() => expect(finishLatestSave).toBeTypeOf("function"));
    expect(mocked.send).not.toHaveBeenCalledWith(
      IPC_CHANNELS.APP_FLUSH_COMPLETE,
      expect.anything(),
    );
    finishLatestSave!(success);

    await appBarrier;
    await oldSave;
    await latestSave;
    expect(mocked.send).toHaveBeenCalledTimes(1);
    expect(mocked.send).toHaveBeenCalledWith(IPC_CHANNELS.APP_FLUSH_COMPLETE, {
      requestId: "quit-barrier",
      hadQueuedAutoSaves: true,
      rendererDirty: false,
    });
  });

  it("cancels the scheduled timer when an explicit flush owns the retry", async () => {
    vi.useFakeTimers();
    const api = mocked.api!;
    let finishFirstSave: ((value: typeof failure) => void) | undefined;
    let autoSaveAttempts = 0;
    mocked.invoke.mockImplementation((channel: string) => {
      if (channel !== IPC_CHANNELS.AUTO_SAVE) return Promise.resolve(success);
      autoSaveAttempts += 1;
      if (autoSaveAttempts === 1) {
        return new Promise<typeof failure>((resolve) => {
          finishFirstSave = resolve;
        });
      }
      return Promise.resolve(success);
    });
    const queuedResult = api
      .autoSave("chapter-timer", "latest", "project-timer")
      .catch((error: unknown) => error);

    const explicitFlush = api.app.manualSave("project-timer");
    await vi.advanceTimersByTimeAsync(0);
    expect(finishFirstSave).toBeTypeOf("function");
    await vi.advanceTimersByTimeAsync(300);
    finishFirstSave!(failure);
    await expect(explicitFlush).rejects.toThrow("disk full");
    expect(await queuedResult).toBeInstanceOf(Error);
    await vi.advanceTimersByTimeAsync(0);
    expect(autoSaveAttempts).toBe(1);

    await api.app.manualSave("project-timer");
    expect(autoSaveAttempts).toBe(2);
  });

  it("retries only failed entries from a mixed flush", async () => {
    const api = mocked.api!;
    mocked.invoke.mockImplementation(async (channel: string, chapterId: string) =>
      channel === IPC_CHANNELS.AUTO_SAVE && chapterId === "chapter-mixed-fail"
        ? failure
        : success,
    );
    const failedSave = api
      .autoSave("chapter-mixed-fail", "failed", "project-mixed")
      .catch((error: unknown) => error);
    const successfulSave = api.autoSave(
      "chapter-mixed-success",
      "saved",
      "project-mixed",
    );

    await expect(api.app.manualSave("project-mixed")).rejects.toThrow("disk full");
    expect(await failedSave).toBeInstanceOf(Error);
    await expect(successfulSave).resolves.toEqual(success);

    mocked.invoke.mockResolvedValue(success);
    await api.app.manualSave("project-mixed");
    const savedChapterIds = mocked.invoke.mock.calls
      .filter(([channel]) => channel === IPC_CHANNELS.AUTO_SAVE)
      .map(([, chapterId]) => chapterId);
    expect(savedChapterIds).toEqual([
      "chapter-mixed-fail",
      "chapter-mixed-success",
      "chapter-mixed-fail",
    ]);
  });

  it("does not acknowledge app flush until a failed autosave succeeds", async () => {
    const api = mocked.api!;
    api.lifecycle.setDirty(true);
    mocked.invoke.mockImplementation(async (channel: string) =>
      channel === IPC_CHANNELS.AUTO_SAVE ? failure : success,
    );
    const queued = api.autoSave("chapter-quit", "latest", "project-quit");
    const queuedResult = queued.catch((error: unknown) => error);

    await expect(api.lifecycle.completeFlush("quit-failed")).rejects.toThrow(
      "disk full",
    );
    expect(await queuedResult).toBeInstanceOf(Error);
    expect(mocked.send).not.toHaveBeenCalledWith(
      IPC_CHANNELS.APP_FLUSH_COMPLETE,
      expect.anything(),
    );

    mocked.invoke.mockResolvedValue(success);
    api.lifecycle.setDirty(false);
    await api.lifecycle.completeFlush("quit-retry");
    expect(mocked.send).toHaveBeenCalledWith(IPC_CHANNELS.APP_FLUSH_COMPLETE, {
      requestId: "quit-retry",
      hadQueuedAutoSaves: true,
      rendererDirty: false,
    });
  });

  it("consumes and logs a background timer flush rejection", async () => {
    vi.useFakeTimers();
    const api = mocked.api!;
    mocked.invoke.mockImplementation(async (channel: string) =>
      channel === IPC_CHANNELS.AUTO_SAVE ? failure : success,
    );
    const queuedResult = api
      .autoSave("chapter-background", "latest", "project-background")
      .catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(300);

    expect(await queuedResult).toBeInstanceOf(Error);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocked.invoke).toHaveBeenCalledWith(
      IPC_CHANNELS.LOGGER_LOG_BATCH,
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          message: "Preload auto-save flush failed",
        }),
      ]),
    );
  });
});
