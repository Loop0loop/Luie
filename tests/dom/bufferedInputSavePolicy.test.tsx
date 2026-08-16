// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BufferedInput,
  BufferedTextArea,
} from "../../src/shared/ui/BufferedInput.js";
import { flushSaveBuffers } from "../../src/shared/ui/saveBufferRegistry.js";

const mountedRoots = new Set<Root>();

const mountInput = (onSave: (value: string) => void | Promise<unknown>) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  act(() => {
    root.render(<BufferedInput value="" onSave={onSave} />);
  });

  const input = container.querySelector("input");
  if (!input) throw new Error("BufferedInput did not render an input");

  return {
    input,
    unmount: () => {
      if (!mountedRoots.delete(root)) return;
      act(() => root.unmount());
      container.remove();
    },
  };
};

const mountTextArea = (onSave: (value: string) => void | Promise<unknown>) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  act(() => {
    root.render(<BufferedTextArea value="" onSave={onSave} />);
  });

  const textarea = container.querySelector("textarea");
  if (!textarea) throw new Error("BufferedTextArea did not render a textarea");

  return {
    textarea,
    unmount: () => {
      if (!mountedRoots.delete(root)) return;
      act(() => root.unmount());
      container.remove();
    },
  };
};

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!valueSetter) throw new Error("HTMLInputElement.value setter is missing");
  valueSetter.call(input, value);
};

const changeInput = (input: HTMLInputElement, value: string) => {
  act(() => {
    setInputValue(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const setTextAreaValue = (textarea: HTMLTextAreaElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  if (!valueSetter) {
    throw new Error("HTMLTextAreaElement.value setter is missing");
  }
  valueSetter.call(textarea, value);
};

const changeTextArea = (textarea: HTMLTextAreaElement, value: string) => {
  act(() => {
    setTextAreaValue(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

describe("BufferedInput save policy", () => {
  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  });

  afterEach(() => {
    for (const root of mountedRoots) {
      act(() => root.unmount());
    }
    mountedRoots.clear();
    document.body.replaceChildren();
    Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    vi.useRealTimers();
  });

  it("flushes the latest value once when blur beats debounce", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { input } = mountInput(onSave);

    act(() => input.focus());
    changeInput(input, "김철수");
    act(() => input.blur());

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenLastCalledWith("김철수");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("does not save an incomplete IME composition", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { input } = mountInput(onSave);

    act(() => {
      input.dispatchEvent(
        new CompositionEvent("compositionstart", {
          bubbles: true,
        }),
      );
    });
    changeInput(input, "김");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      setInputValue(input, "김");
      input.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "김",
        }),
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("김");
  });

  it("waits for the final IME input value before resolving an explicit flush", async () => {
    const onSave = vi.fn();
    const { input } = mountInput(onSave);

    act(() => {
      input.dispatchEvent(
        new CompositionEvent("compositionstart", {
          bubbles: true,
        }),
      );
    });
    changeInput(input, "미완성");

    let settled = false;
    const flush = flushSaveBuffers().then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(settled).toBe(false);
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      setInputValue(input, "완성 값");
      input.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "",
        }),
      );
    });
    await act(async () => flush);

    expect(settled).toBe(true);
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("완성 값");
  });

  it("coalesces repeated explicit flushes while a textarea is composing", async () => {
    const onSave = vi.fn();
    const { textarea } = mountTextArea(onSave);

    act(() => {
      textarea.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
    });
    changeTextArea(textarea, "작성 중");

    const firstFlush = flushSaveBuffers();
    const secondFlush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      setTextAreaValue(textarea, "작성 완료");
      textarea.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "작성 완료",
        }),
      );
    });
    await act(async () => Promise.all([firstFlush, secondFlush]));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("작성 완료");
  });

  it("drains the latest value after an older save is in-flight during unmount", async () => {
    vi.useFakeTimers();
    let resolveFirst: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi.fn((value: string) =>
      value === "첫 값" ? firstSave : Promise.resolve(),
    );
    const { input, unmount } = mountInput(onSave);

    changeInput(input, "첫 값");
    await act(async () => vi.advanceTimersByTimeAsync(250));
    changeInput(input, "퇴장 직전 값");
    unmount();
    const flush = flushSaveBuffers();
    resolveFirst?.();
    await act(async () => flush);

    expect(onSave.mock.calls).toEqual([["첫 값"], ["퇴장 직전 값"]]);
  });

  it("flushes a dirty input before its debounce timer", async () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { input } = mountInput(onSave);

    act(() => input.focus());
    changeInput(input, "즉시 저장");
    await act(async () => flushSaveBuffers());

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("즉시 저장");
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("flushes a focused textarea without blur", async () => {
    const onSave = vi.fn();
    const { textarea } = mountTextArea(onSave);

    act(() => textarea.focus());
    changeTextArea(textarea, "포커스된 본문");
    await act(async () => flushSaveBuffers());

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("포커스된 본문");
  });

  it("removes an unmounted input from the global registry", async () => {
    const onSave = vi.fn();
    const { input, unmount } = mountInput(onSave);
    changeInput(input, "unmount 값");
    unmount();
    onSave.mockClear();

    await act(async () => flushSaveBuffers());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("waits for an in-flight input save before flushing a newer value", async () => {
    vi.useFakeTimers();
    let resolveFirst: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi.fn((value: string) => {
      return value === "첫 값" ? firstSave : Promise.resolve();
    });
    const { input } = mountInput(onSave);

    act(() => input.focus());
    changeInput(input, "첫 값");
    await act(async () => vi.advanceTimersByTimeAsync(250));
    changeInput(input, "최신 값");

    let settled = false;
    const flush = flushSaveBuffers();
    void flush.then(() => {
      settled = true;
    });
    await act(async () => Promise.resolve());

    expect(settled).toBe(false);
    expect(onSave).toHaveBeenCalledOnce();

    resolveFirst?.();
    await act(async () => flush);
    expect(onSave.mock.calls).toEqual([["첫 값"], ["최신 값"]]);
  });

  it("waits for the final IME value behind an older in-flight save", async () => {
    vi.useFakeTimers();
    let resolveFirst: (() => void) | undefined;
    const firstSave = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const onSave = vi.fn().mockReturnValueOnce(firstSave);
    const { input } = mountInput(onSave);

    act(() => input.focus());
    changeInput(input, "첫 값");
    await act(async () => vi.advanceTimersByTimeAsync(250));
    changeInput(input, "조합 중 최신 값");
    const flush = flushSaveBuffers();
    await act(async () => Promise.resolve());
    act(() => {
      input.dispatchEvent(
        new CompositionEvent("compositionstart", {
          bubbles: true,
        }),
      );
    });

    let settled = false;
    void flush.then(() => {
      settled = true;
    });
    resolveFirst?.();
    await act(async () => Promise.resolve());

    expect(settled).toBe(false);
    expect(onSave.mock.calls).toEqual([["첫 값"]]);

    act(() => {
      setInputValue(input, "조합 완료 값");
      input.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "조합 완료 값",
        }),
      );
    });
    await act(async () => flush);

    expect(onSave.mock.calls).toEqual([["첫 값"], ["조합 완료 값"]]);
  });

  it("rejects a pending IME flush when the input unmounts", async () => {
    const onSave = vi.fn();
    const { input, unmount } = mountInput(onSave);

    act(() => {
      input.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true }),
      );
    });
    changeInput(input, "조합 중");

    const flush = flushSaveBuffers();
    const rejection = expect(flush).rejects.toThrow(/unmounted/i);
    unmount();

    await rejection;
    expect(onSave).not.toHaveBeenCalled();
  });

  it("retries a textarea value after its async save rejects", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("save failed"))
      .mockResolvedValueOnce(undefined);
    const { textarea } = mountTextArea(onSave);

    act(() => textarea.focus());
    changeTextArea(textarea, "재시도할 본문");

    await expect(flushSaveBuffers()).rejects.toThrow("save failed");
    await act(async () => flushSaveBuffers());

    expect(onSave.mock.calls).toEqual([["재시도할 본문"], ["재시도할 본문"]]);
  });

  it.each([
    ["debounce", (_input: HTMLInputElement) => undefined],
    ["blur", (input: HTMLInputElement) => input.blur()],
    [
      "Enter",
      (input: HTMLInputElement) =>
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            bubbles: true,
            key: "Enter",
          }),
        ),
    ],
  ])(
    "consumes a %s rejection and retries the dirty input",
    async (kind, trigger) => {
      vi.useFakeTimers();
      const onSave = vi
        .fn()
        .mockRejectedValueOnce(new Error(`${kind} failed`))
        .mockResolvedValueOnce(undefined);
      const { input } = mountInput(onSave);

      act(() => input.focus());
      changeInput(input, `${kind} payload`);
      act(() => trigger(input));
      if (kind === "debounce") {
        await act(async () => vi.advanceTimersByTimeAsync(250));
      } else {
        await act(async () => Promise.resolve());
      }

      await act(async () => flushSaveBuffers());
      expect(onSave.mock.calls).toEqual([
        [`${kind} payload`],
        [`${kind} payload`],
      ]);
    },
  );

  it("propagates a pending IME save failure and retries the dirty textarea", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("composition end failed"))
      .mockResolvedValueOnce(undefined);
    const { textarea } = mountTextArea(onSave);

    act(() => {
      textarea.dispatchEvent(
        new CompositionEvent("compositionstart", {
          bubbles: true,
        }),
      );
    });
    changeTextArea(textarea, "완성 값");
    const flush = flushSaveBuffers();
    act(() => {
      setTextAreaValue(textarea, "완성 값");
      textarea.dispatchEvent(
        new CompositionEvent("compositionend", {
          bubbles: true,
          data: "완성 값",
        }),
      );
    });
    await expect(flush).rejects.toThrow("composition end failed");

    await act(async () => flushSaveBuffers());
    expect(onSave.mock.calls).toEqual([["완성 값"], ["완성 값"]]);
  });

  it("keeps a failed unmount payload registered until a later flush succeeds", async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error("unmount failed"))
      .mockResolvedValueOnce(undefined);
    const { input, unmount } = mountInput(onSave);
    changeInput(input, "unmount retry payload");

    unmount();
    await act(async () => Promise.resolve());
    await act(async () => flushSaveBuffers());

    expect(onSave.mock.calls).toEqual([
      ["unmount retry payload"],
      ["unmount retry payload"],
    ]);
    await expect(flushSaveBuffers()).resolves.toBeUndefined();
    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
