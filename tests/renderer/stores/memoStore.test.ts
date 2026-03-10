import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "../../../src/shared/constants/index.js";

const mocked = vi.hoisted(() => ({
  storage: {
    loadScrapMemos: vi.fn(),
    saveScrapMemos: vi.fn(),
  },
  warn: vi.fn(),
}));

vi.mock(
  "../../../src/renderer/src/features/research/services/worldPackageStorage.js",
  () => ({
    worldPackageStorage: mocked.storage,
  }),
);

type MemoStoreModule =
  typeof import("../../../src/renderer/src/features/research/stores/memoStore.js");

const sampleNote = {
  id: "memo-1",
  title: "First memo",
  content: "Body",
  tags: ["alpha"],
  updatedAt: "2026-03-10T00:00:00.000Z",
};

describe("memoStore", () => {
  let memoStoreModule: MemoStoreModule;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    mocked.storage.loadScrapMemos.mockReset();
    mocked.storage.saveScrapMemos.mockReset();
    mocked.warn.mockReset();
    mocked.storage.loadScrapMemos.mockResolvedValue({ memos: [] });
    mocked.storage.saveScrapMemos.mockResolvedValue(undefined);

    Object.defineProperty(globalThis, "window", {
      value: {
        api: {
          logger: {
            warn: mocked.warn,
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
});
