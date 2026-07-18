// @vitest-environment jsdom
// TEST_LEVEL: DOM_INTEGRATION
// PROVES: quit completes only after renderer save buffers and world mutations flush

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  beforeQuit: undefined as (() => void) | undefined,
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
      onBeforeQuit: (callback: () => void) => {
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
    act(() => mocked.beforeQuit?.());

    await vi.waitFor(() =>
      expect(mocked.calls).toEqual(["buffers", "world", "complete"]),
    );
    expect(mocked.setDirty).toHaveBeenCalledWith(true);
  });

  it("does not complete quit when a renderer buffer fails", async () => {
    mocked.flushSaveBuffers.mockRejectedValueOnce(new Error("buffer failed"));

    act(() => mocked.beforeQuit?.());

    await vi.waitFor(() => expect(mocked.loggerError).toHaveBeenCalledOnce());
    expect(mocked.flushWorldEntityMutations).not.toHaveBeenCalled();
    expect(mocked.completeFlush).not.toHaveBeenCalled();
  });

  it("does not complete quit when a world mutation fails", async () => {
    mocked.flushWorldEntityMutations.mockRejectedValueOnce(
      new Error("world failed"),
    );

    act(() => mocked.beforeQuit?.());

    await vi.waitFor(() => expect(mocked.loggerError).toHaveBeenCalledOnce());
    expect(mocked.flushSaveBuffers).toHaveBeenCalledOnce();
    expect(mocked.completeFlush).not.toHaveBeenCalled();
  });
});
