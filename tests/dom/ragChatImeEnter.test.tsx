// @vitest-environment jsdom

import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  handleSend: vi.fn(async () => undefined),
  handleStop: vi.fn(),
  setInput: vi.fn(),
}));

vi.mock("zustand/react/shallow", () => ({
  useShallow: <T,>(selector: T) => selector,
}));

vi.mock("@renderer/features/research/stores/analysisStore", () => ({
  useAnalysisStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      messages: [],
      input: "질문",
      setInput: mocked.setInput,
      isStreaming: false,
      handleSend: mocked.handleSend,
      handleStop: mocked.handleStop,
    }),
}));

vi.mock("@renderer/features/workspace/services/chapterNavigation", () => ({
  requestChapterNavigation: vi.fn(),
}));

import { useRagChat } from "../../src/renderer/src/features/research/components/analysisSection/chat/useRagChat.js";

function Harness({ onReady }: { onReady: (handler: ReturnType<typeof useRagChat>["handleKeyDown"]) => void }) {
  const { handleKeyDown } = useRagChat({
    projectId: "project-1",
    chapterId: "chapter-1",
    memoryScope: "current-only",
  });
  useEffect(() => onReady(handleKeyDown), [handleKeyDown, onReady]);
  return null;
}

describe("RAG chat IME Enter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("조합 중 Enter는 전송하지 않는다", () => {
    let handleKeyDown: ReturnType<typeof useRagChat>["handleKeyDown"] | undefined;
    act(() => root.render(<Harness onReady={(handler) => { handleKeyDown = handler; }} />));
    const preventDefault = vi.fn();

    act(() => {
      handleKeyDown?.({
        key: "Enter",
        shiftKey: false,
        nativeEvent: { isComposing: true, keyCode: 229 },
        preventDefault,
      } as never);
    });

    expect(preventDefault).not.toHaveBeenCalled();
    expect(mocked.handleSend).not.toHaveBeenCalled();
  });

  it("일반 Enter는 기존처럼 전송한다", () => {
    let handleKeyDown: ReturnType<typeof useRagChat>["handleKeyDown"] | undefined;
    act(() => root.render(<Harness onReady={(handler) => { handleKeyDown = handler; }} />));
    const preventDefault = vi.fn();

    act(() => {
      handleKeyDown?.({
        key: "Enter",
        shiftKey: false,
        nativeEvent: { isComposing: false, keyCode: 13 },
        preventDefault,
      } as never);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(mocked.handleSend).toHaveBeenCalledWith(
      "project-1",
      "chapter-1",
      "current-only",
    );
  });
});
