// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorAutosave } from "../../src/renderer/src/features/editor/hooks/useEditorAutosave.js";
import { EDITOR_AUTOSAVE_DEBOUNCE_MS } from "../../src/shared/constants/index.js";
import { flushSaveBuffers } from "../../src/shared/ui/saveBufferRegistry.js";

const mocked = vi.hoisted(() => ({
  setDirty: vi.fn(),
  showToast: vi.fn(),
  t: (key: string) => key,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: mocked.t }),
}));

vi.mock("@shared/ui/ToastContext", () => ({
  useToast: () => ({ showToast: mocked.showToast }),
}));

vi.mock("@shared/api", () => ({
  api: {
    lifecycle: { setDirty: mocked.setDirty },
    logger: { error: vi.fn() },
  },
}));

type HarnessProps = {
  title: string;
  content: string;
  onSave?: (title: string, content: string) => Promise<void>;
};

const mountedRoots = new Set<Root>();

const Harness = (props: HarnessProps) => {
  useEditorAutosave(props);
  return null;
};

const mountAutosave = (initial: HarnessProps) => {
  const container = document.createElement("div");
  const root = createRoot(container);
  mountedRoots.add(root);
  act(() => root.render(<Harness {...initial} />));

  return {
    render: (props: HarnessProps) =>
      act(() => root.render(<Harness {...props} />)),
    unmount: () => {
      if (!mountedRoots.delete(root)) return;
      act(() => root.unmount());
    },
  };
};

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const afterMicrotasks = (count: number) => {
  let promise = Promise.resolve();
  for (let index = 0; index < count; index++) {
    promise = promise.then(() => undefined);
  }
  return promise;
};

describe("editor autosave manual flush", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    for (const root of mountedRoots) {
      act(() => root.unmount());
    }
    mountedRoots.clear();
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("flushes the latest editor draft before autosave debounce", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn(async () => undefined);
    const root = mountAutosave({
      title: "이전 제목",
      content: "이전 본문",
      onSave,
    });

    root.render({ title: "최신 제목", content: "최신 본문", onSave });
    await act(async () => flushSaveBuffers());

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("최신 제목", "최신 본문");
    await act(async () =>
      vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS),
    );
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("waits for the latest draft queued behind an in-flight save", async () => {
    vi.useFakeTimers();
    const first = deferred<void>();
    const onSave = vi
      .fn<(title: string, content: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined);
    const root = mountAutosave({ title: "A", content: "1", onSave });

    root.render({ title: "B", content: "2", onSave });
    await act(async () =>
      vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS),
    );
    root.render({ title: "C", content: "3", onSave });
    const flushPromise = flushSaveBuffers();

    first.resolve();
    await act(async () => flushPromise);

    expect(onSave).toHaveBeenLastCalledWith("C", "3");
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("rejects manual flush when the latest editor save fails", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("chapter save failed");
    });
    const root = mountAutosave({ title: "A", content: "1", onSave });
    root.render({ title: "B", content: "2", onSave });

    await expect(flushSaveBuffers()).rejects.toThrow("chapter save failed");
  });

  it("continues to the latest draft when an older in-flight save fails", async () => {
    vi.useFakeTimers();
    const first = deferred<void>();
    const onSave = vi
      .fn<(title: string, content: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined);
    const root = mountAutosave({ title: "A", content: "1", onSave });

    root.render({ title: "B", content: "2", onSave });
    await act(async () =>
      vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS),
    );
    root.render({ title: "C", content: "3", onSave });
    const flushPromise = flushSaveBuffers();

    first.reject(new Error("stale save failed"));
    await act(async () => flushPromise);

    expect(onSave.mock.calls).toEqual([
      ["B", "2"],
      ["C", "3"],
    ]);
  });

  it("does nothing for clean editors and hooks without onSave", async () => {
    const onSave = vi.fn(async () => undefined);
    mountAutosave({ title: "A", content: "1", onSave });
    mountAutosave({ title: "B", content: "2" });

    await expect(flushSaveBuffers()).resolves.toBeUndefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("drains the latest draft after unmount without a parallel save", async () => {
    vi.useFakeTimers();
    const first = deferred<void>();
    const onSave = vi
      .fn<(title: string, content: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(undefined);
    const root = mountAutosave({ title: "A", content: "1", onSave });

    root.render({ title: "B", content: "2", onSave });
    await act(async () =>
      vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS),
    );
    root.render({ title: "C", content: "3", onSave });
    const flushPromise = flushSaveBuffers();
    await act(async () => Promise.resolve());

    root.unmount();
    expect(onSave).toHaveBeenCalledTimes(1);

    first.resolve();
    await act(async () => flushPromise);
    expect(onSave.mock.calls).toEqual([
      ["B", "2"],
      ["C", "3"],
    ]);
  });

  it("does not repeat the latest draft when its debounce fires after flush", async () => {
    vi.useFakeTimers();
    const first = deferred<void>();
    const onSave = vi
      .fn<(title: string, content: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(undefined);
    const root = mountAutosave({ title: "A", content: "1", onSave });

    root.render({ title: "B", content: "2", onSave });
    const flushPromise = flushSaveBuffers();
    await act(async () => Promise.resolve());
    root.render({ title: "C", content: "3", onSave });

    first.resolve();
    await act(async () => flushPromise);
    expect(onSave.mock.calls).toEqual([
      ["B", "2"],
      ["C", "3"],
    ]);

    await act(async () =>
      vi.advanceTimersByTimeAsync(EDITOR_AUTOSAVE_DEBOUNCE_MS),
    );
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it("rejects once when the latest save rejects with undefined", async () => {
    const onSave = vi
      .fn<(title: string, content: string) => Promise<void>>()
      .mockRejectedValueOnce(undefined)
      .mockRejectedValue(new Error("unexpected retry"));
    const root = mountAutosave({ title: "A", content: "1", onSave });
    root.render({ title: "B", content: "2", onSave });

    const noRejection = Symbol("no rejection");
    let rejection: unknown = noRejection;
    await act(async () => {
      try {
        await flushSaveBuffers();
      } catch (error) {
        rejection = error;
      }
    });

    expect(rejection).toBeUndefined();
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("settles after an in-flight save when the latest draft has no onSave", async () => {
    const first = deferred<void>();
    const onSave = vi
      .fn<(title: string, content: string) => Promise<void>>()
      .mockReturnValueOnce(first.promise);
    const root = mountAutosave({ title: "A", content: "1", onSave });

    root.render({ title: "B", content: "2", onSave });
    const flushPromise = flushSaveBuffers();
    await act(async () => Promise.resolve());
    expect(onSave).toHaveBeenCalledOnce();

    root.render({ title: "C", content: "3" });
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    first.resolve();
    const settled = await Promise.race([
      flushPromise.then(() => true),
      afterMicrotasks(20).then(() => false),
    ]);
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

    if (!settled) {
      root.unmount();
      await act(async () => flushPromise);
    }

    expect(settled).toBe(true);
    expect(onSave).toHaveBeenCalledOnce();
  });
});
