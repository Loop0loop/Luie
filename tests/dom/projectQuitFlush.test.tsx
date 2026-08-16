// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: renderer save buffer와 world mutation을 flush한 뒤에만 quit가 완료된다.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  beforeQuit: undefined as
    | ((payload: { requestId: string }) => void)
    | undefined,
  calls: [] as string[],
  flushSaveBuffers: vi.fn(async () => undefined),
  flushWorldEntityMutations: vi.fn(async () => undefined),
  getPendingWorldEntityMutationCount: vi.fn(() => 1),
  setDirty: vi.fn(),
  completeFlush: vi.fn(async () => undefined),
  loggerError: vi.fn(async () => undefined),
}));

vi.mock("@shared/ui/saveBufferRegistry", () => ({
  flushSaveBuffers: mocked.flushSaveBuffers,
}));

vi.mock("@renderer/shared/store/worldEntityMutationQueue", () => ({
  flushWorldEntityMutations: mocked.flushWorldEntityMutations,
  getPendingWorldEntityMutationCount: mocked.getPendingWorldEntityMutationCount,
}));

vi.mock("@shared/api", () => ({
  api: {
    lifecycle: {
      onBeforeQuit: (callback: (payload: { requestId: string }) => void) => {
        mocked.beforeQuit = callback;
        return () => {
          mocked.beforeQuit = undefined;
        };
      },
      setDirty: mocked.setDirty,
      completeFlush: mocked.completeFlush,
    },
    logger: { error: mocked.loggerError },
  },
}));

import { useProjectQuitFlush } from "../../src/renderer/src/features/workspace/hooks/useProjectQuitFlush.js";

function Harness() {
  useProjectQuitFlush();
  return null;
}

describe("useProjectQuitFlush", () => {
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    mocked.beforeQuit = undefined;
    mocked.calls.length = 0;
    mocked.flushSaveBuffers.mockReset().mockImplementation(async () => {
      mocked.calls.push("buffers");
    });
    mocked.flushWorldEntityMutations.mockReset().mockImplementation(async () => {
      mocked.calls.push("world");
    });
    mocked.getPendingWorldEntityMutationCount.mockReset().mockReturnValue(1);
    mocked.setDirty.mockReset();
    mocked.setDirty.mockImplementation((dirty: boolean) => {
      mocked.calls.push(dirty ? "dirty" : "clean");
    });
    mocked.completeFlush.mockReset().mockImplementation(async () => {
      mocked.calls.push("complete");
    });
    mocked.loggerError.mockReset().mockResolvedValue(undefined);

    root = createRoot(document.createElement("div"));
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
  });

  it("completes quit only after buffers and world mutations flush", async () => {
    act(() => mocked.beforeQuit?.({ requestId: "quit-1" }));

    await vi.waitFor(() =>
      expect(mocked.calls).toEqual([
        "dirty",
        "buffers",
        "world",
        "clean",
        "complete",
      ]),
    );
    expect(mocked.setDirty).toHaveBeenNthCalledWith(1, true);
    expect(mocked.setDirty).toHaveBeenNthCalledWith(2, false);
    expect(mocked.completeFlush).toHaveBeenCalledWith("quit-1");
  });

  it("does not complete quit when a renderer buffer fails", async () => {
    mocked.flushSaveBuffers.mockRejectedValueOnce(new Error("buffer failed"));

    act(() => mocked.beforeQuit?.({ requestId: "quit-2" }));

    await vi.waitFor(() => expect(mocked.loggerError).toHaveBeenCalledOnce());
    expect(mocked.flushWorldEntityMutations).not.toHaveBeenCalled();
    expect(mocked.completeFlush).not.toHaveBeenCalled();
    expect(mocked.setDirty).toHaveBeenLastCalledWith(true);
  });

  it("does not complete quit when a world mutation fails", async () => {
    mocked.flushWorldEntityMutations.mockRejectedValueOnce(
      new Error("world failed"),
    );

    act(() => mocked.beforeQuit?.({ requestId: "quit-3" }));

    await vi.waitFor(() => expect(mocked.loggerError).toHaveBeenCalledOnce());
    expect(mocked.flushSaveBuffers).toHaveBeenCalledOnce();
    expect(mocked.completeFlush).not.toHaveBeenCalled();
    expect(mocked.setDirty).toHaveBeenLastCalledWith(true);
  });

  it("restores dirty state when preload autosave completion fails", async () => {
    mocked.completeFlush.mockRejectedValueOnce(new Error("autosave failed"));

    act(() => mocked.beforeQuit?.({ requestId: "quit-4" }));

    await vi.waitFor(() => expect(mocked.loggerError).toHaveBeenCalledOnce());
    expect(mocked.setDirty).toHaveBeenNthCalledWith(1, true);
    expect(mocked.setDirty).toHaveBeenNthCalledWith(2, false);
    expect(mocked.setDirty).toHaveBeenNthCalledWith(3, true);
  });
});
