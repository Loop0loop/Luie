import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as MemoStoreModule from "../../../src/renderer/src/features/research/stores/memoStore.js";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "../../../src/shared/constants/index.js";

const mocked = vi.hoisted(() => ({
  storage: {
    loadScrapMemos: vi.fn(),
    saveScrapMemos: vi.fn(),
  },
  warn: vi.fn(),
  info: vi.fn(),
}));

vi.mock(
  "../../../src/renderer/src/features/research/services/worldPackageStorage.js",
  () => ({
    worldPackageStorage: mocked.storage,
  }),
);

const sampleNote = {
  id: "memo-1",
  title: "First memo",
  content: "Body",
  tags: ["alpha"],
  updatedAt: "2026-03-10T00:00:00.000Z",
};

describe("memoStore", () => {
  let memoStoreModule: typeof MemoStoreModule;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    mocked.storage.loadScrapMemos.mockReset();
    mocked.storage.saveScrapMemos.mockReset();
    mocked.warn.mockReset();
    mocked.info.mockReset();
    mocked.storage.loadScrapMemos.mockResolvedValue({ memos: [] });
    mocked.storage.saveScrapMemos.mockResolvedValue(undefined);

    Object.defineProperty(globalThis, "window", {
      value: {
        api: {
          logger: {
            warn: mocked.warn,
            info: mocked.info,
          },
        },
      },
      configurable: true,
      writable: true,
    });

    memoStoreModule =
      await import("../../../src/renderer/src/features/research/stores/memoStore.js");
    memoStoreModule.useMemoStore.getState().reset();
  });

  afterEach(() => {
    memoStoreModule.useMemoStore.getState().reset();
    Reflect.deleteProperty(globalThis, "window");
    vi.useRealTimers();
  });

  it("loads notes into the active project scope", async () => {
    mocked.storage.loadScrapMemos.mockResolvedValueOnce({
      memos: [sampleNote],
    });

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");

    const state = memoStoreModule.useMemoStore.getState();
    expect(state.activeProjectId).toBe("project-1");
    expect(state.activeProjectPath).toBe("/tmp/project-1.luie");
    expect(state.notes).toEqual([sampleNote]);
    expect(state.isLoading).toBe(false);
  });

  it("does not reload the same project memo payload on tab remount", async () => {
    mocked.storage.loadScrapMemos.mockResolvedValueOnce({
      memos: [sampleNote],
    });

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");

    expect(mocked.storage.loadScrapMemos).toHaveBeenCalledTimes(1);
  });

  it("adds, updates, deletes, and persists notes for the active project only", async () => {
    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");

    const added = memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "Initial",
      tags: ["beta"],
    });

    expect(added).not.toBeNull();
    expect(memoStoreModule.useMemoStore.getState().notes).toHaveLength(1);

    memoStoreModule.useMemoStore.getState().updateNote(added!.id, {
      content: "Updated",
      tags: ["gamma"],
    });
    expect(memoStoreModule.useMemoStore.getState().notes[0]?.content).toBe(
      "Updated",
    );
    expect(memoStoreModule.useMemoStore.getState().notes[0]?.tags).toEqual([
      "gamma",
    ]);

    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
    await memoStoreModule.useMemoStore.getState().flushSave();

    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        memos: [
          expect.objectContaining({
            id: added!.id,
            content: "Updated",
            tags: ["gamma"],
          }),
        ],
      }),
    );

    memoStoreModule.useMemoStore.getState().deleteNote(added!.id);
    expect(memoStoreModule.useMemoStore.getState().notes).toHaveLength(0);

    const wrongProjectAdd = memoStoreModule.useMemoStore
      .getState()
      .addNote("project-2", {
        title: "Ignore",
        content: "Nope",
        tags: [],
      });
    expect(wrongProjectAdd).toBeNull();
    expect(memoStoreModule.useMemoStore.getState().notes).toHaveLength(0);
  });

  it("replaces notes on project switch and resets cleanly", async () => {
    mocked.storage.loadScrapMemos
      .mockResolvedValueOnce({ memos: [sampleNote] })
      .mockResolvedValueOnce({
        memos: [
          {
            ...sampleNote,
            id: "memo-2",
            title: "Second memo",
          },
        ],
      });

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-2", "/tmp/project-2.luie");

    const switched = memoStoreModule.useMemoStore.getState();
    expect(switched.activeProjectId).toBe("project-2");
    expect(switched.notes).toEqual([
      expect.objectContaining({
        id: "memo-2",
        title: "Second memo",
      }),
    ]);

    switched.reset();
    const resetState = memoStoreModule.useMemoStore.getState();
    expect(resetState.activeProjectId).toBeNull();
    expect(resetState.notes).toEqual([]);
    expect(resetState.error).toBeNull();
  });

  it("flushes pending memo changes before switching project scope", async () => {
    mocked.storage.loadScrapMemos
      .mockResolvedValueOnce({ memos: [] })
      .mockResolvedValueOnce({
        memos: [
          {
            ...sampleNote,
            id: "memo-2",
            title: "Project two",
          },
        ],
      });

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");

    const added = memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Unsaved",
      content: "Must flush before switch",
      tags: ["pending"],
    });

    expect(added).not.toBeNull();

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-2", "/tmp/project-2.luie");

    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        memos: [
          expect.objectContaining({
            id: added!.id,
            content: "Must flush before switch",
            tags: ["pending"],
          }),
        ],
      }),
    );

    expect(memoStoreModule.useMemoStore.getState().activeProjectId).toBe(
      "project-2",
    );
  });

  it("ignores stale memo loads that resolve after a project switch", async () => {
    let resolveProjectOne: ((value: { memos: typeof sampleNote[] }) => void) | null =
      null;
    mocked.storage.loadScrapMemos
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveProjectOne = resolve;
          }),
      )
      .mockResolvedValueOnce({
        memos: [
          {
            ...sampleNote,
            id: "memo-2",
            title: "Fresh project memo",
          },
        ],
      });

    const firstLoad = memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    await Promise.resolve();

    const secondLoad = memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-2", "/tmp/project-2.luie");
    await secondLoad;

    resolveProjectOne?.({ memos: [sampleNote] });
    await firstLoad;

    const state = memoStoreModule.useMemoStore.getState();
    expect(state.activeProjectId).toBe("project-2");
    expect(state.notes).toEqual([
      expect.objectContaining({
        id: "memo-2",
        title: "Fresh project memo",
      }),
    ]);
  });

  it("records memo load timing after successful load", async () => {
    mocked.storage.loadScrapMemos.mockResolvedValueOnce({
      memos: [sampleNote],
    });

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");

    expect(mocked.info).toHaveBeenCalledWith(
      "memo-store.load-notes",
      expect.objectContaining({
        event: "memo-store.load-notes",
        scope: "memo-store",
        projectId: "project-1",
        noteCount: 1,
      }),
    );
  });

  it("rejects failed persistence and retries the dirty memo snapshot", async () => {
    const failure = new Error(
      "Failed to persist scrap world data to canonical .luie.",
    );
    mocked.storage.saveScrapMemos
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(undefined);

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");

    memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "Initial",
      tags: [],
    });

    const firstFlush = memoStoreModule.useMemoStore.getState().flushSave();
    await expect(firstFlush).rejects.toBe(failure);

    expect(memoStoreModule.useMemoStore.getState().saveError).toBe(
      "Failed to persist scrap world data to canonical .luie.",
    );

    await expect(
      memoStoreModule.useMemoStore.getState().flushSave(),
    ).resolves.toBeUndefined();
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(2);
  });

  it("consumes a scheduled save rejection and keeps it retryable", async () => {
    mocked.storage.saveScrapMemos
      .mockRejectedValueOnce(new Error("scheduled memo failure"))
      .mockResolvedValueOnce(undefined);

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "Retry me",
      tags: [],
    });

    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
    expect(memoStoreModule.useMemoStore.getState().saveError).toBe(
      "scheduled memo failure",
    );

    await expect(
      memoStoreModule.useMemoStore.getState().flushSave(),
    ).resolves.toBeUndefined();
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(2);
  });

  it("drains the latest memo snapshot after an in-flight save", async () => {
    let resolveFirst!: () => void;
    mocked.storage.saveScrapMemos
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    const note = memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "First snapshot",
      tags: [],
    });
    if (!note) throw new Error("memo creation failed");

    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
    memoStoreModule.useMemoStore.getState().updateNote(note.id, {
      content: "Latest snapshot",
    });
    const flush = memoStoreModule.useMemoStore.getState().flushSave();
    await Promise.resolve();
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(1);

    resolveFirst();
    await flush;

    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(2);
    expect(mocked.storage.saveScrapMemos).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        memos: [expect.objectContaining({ content: "Latest snapshot" })],
      }),
    );
  });

  it("does not start a scheduled latest save before the in-flight save settles", async () => {
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    mocked.storage.saveScrapMemos
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveSecond = resolve;
          }),
      );

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    const note = memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "P1",
      tags: [],
    });
    if (!note) throw new Error("memo creation failed");
    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);

    memoStoreModule.useMemoStore.getState().updateNote(note.id, { content: "P2" });
    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(1);

    let settled = false;
    const flush = memoStoreModule.useMemoStore
      .getState()
      .flushSave()
      .then(() => {
        settled = true;
      });
    resolveFirst();
    await Promise.resolve();
    await Promise.resolve();

    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(2);
    expect(mocked.storage.saveScrapMemos).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        memos: [expect.objectContaining({ content: "P2" })],
      }),
    );
    expect(settled).toBe(false);

    resolveSecond();
    await flush;
    expect(settled).toBe(true);
  });

  it("retries the latest snapshot after an in-flight save failure", async () => {
    let rejectFirst!: (error: Error) => void;
    mocked.storage.saveScrapMemos
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValueOnce(undefined);

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    const note = memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "P1",
      tags: [],
    });
    if (!note) throw new Error("memo creation failed");
    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
    memoStoreModule.useMemoStore.getState().updateNote(note.id, { content: "P2" });

    const failure = new Error("P1 failed");
    const firstFlush = memoStoreModule.useMemoStore.getState().flushSave();
    rejectFirst(failure);
    await expect(firstFlush).rejects.toBe(failure);
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(1);

    await expect(
      memoStoreModule.useMemoStore.getState().flushSave(),
    ).resolves.toBeUndefined();
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(2);
    expect(mocked.storage.saveScrapMemos).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        memos: [expect.objectContaining({ content: "P2" })],
      }),
    );
  });

  it("rejects a failed latest save after the older in-flight save succeeds", async () => {
    let resolveFirst!: () => void;
    const latestFailure = new Error("P2 failed");
    mocked.storage.saveScrapMemos
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockRejectedValueOnce(latestFailure)
      .mockResolvedValueOnce(undefined);

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    const note = memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Draft",
      content: "P1",
      tags: [],
    });
    if (!note) throw new Error("memo creation failed");
    await vi.advanceTimersByTimeAsync(DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);
    memoStoreModule.useMemoStore.getState().updateNote(note.id, { content: "P2" });

    const flush = memoStoreModule.useMemoStore.getState().flushSave();
    resolveFirst();
    await expect(flush).rejects.toBe(latestFailure);
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(2);

    await expect(
      memoStoreModule.useMemoStore.getState().flushSave(),
    ).resolves.toBeUndefined();
    expect(mocked.storage.saveScrapMemos).toHaveBeenCalledTimes(3);
    expect(mocked.storage.saveScrapMemos).toHaveBeenLastCalledWith(
      "project-1",
      "/tmp/project-1.luie",
      expect.objectContaining({
        memos: [expect.objectContaining({ content: "P2" })],
      }),
    );
  });

  it("keeps the previous project scope when its pending save blocks a switch", async () => {
    const failure = new Error("scope save failed");
    mocked.storage.saveScrapMemos.mockRejectedValueOnce(failure);

    await memoStoreModule.useMemoStore
      .getState()
      .loadNotes("project-1", "/tmp/project-1.luie");
    memoStoreModule.useMemoStore.getState().addNote("project-1", {
      title: "Unsaved",
      content: "Keep in project one",
      tags: [],
    });

    await expect(
      memoStoreModule.useMemoStore
        .getState()
        .loadNotes("project-2", "/tmp/project-2.luie"),
    ).rejects.toBe(failure);

    const state = memoStoreModule.useMemoStore.getState();
    expect(state.activeProjectId).toBe("project-1");
    expect(state.notes).toEqual([
      expect.objectContaining({ content: "Keep in project one" }),
    ]);
    expect(state.saveError).toBe("scope save failed");
  });
});
