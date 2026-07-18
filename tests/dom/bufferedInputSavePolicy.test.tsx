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

const mountInput = (onSave: (value: string) => void) => {
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

const mountTextArea = (onSave: (value: string) => void) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  act(() => {
    root.render(<BufferedTextArea value="" onSave={onSave} />);
  });

  const textarea = container.querySelector("textarea");
  if (!textarea) throw new Error("BufferedTextArea did not render a textarea");

  return { textarea };
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

const setTextAreaValue = (
  textarea: HTMLTextAreaElement,
  value: string,
) => {
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
      input.dispatchEvent(new CompositionEvent("compositionstart", {
        bubbles: true,
      }));
    });
    changeInput(input, "김");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(onSave).not.toHaveBeenCalled();

    act(() => {
      setInputValue(input, "김");
      input.dispatchEvent(new CompositionEvent("compositionend", {
        bubbles: true,
        data: "김",
      }));
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("김");
  });

  it("flushes the latest dirty value once on unmount", () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { input, unmount } = mountInput(onSave);

    changeInput(input, "퇴장 직전 값");
    unmount();

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("퇴장 직전 값");
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
});
