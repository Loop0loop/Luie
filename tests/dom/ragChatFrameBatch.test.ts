// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AnalysisActionState,
  AnalysisSet,
} from "../../src/renderer/src/features/research/stores/analysis/analysisStore.types.js";

const mocked = vi.hoisted(() => ({
  ask: vi.fn(),
  onError: vi.fn(),
  onStream: vi.fn(),
  stop: vi.fn(),
  streamHandler: null as ((payload: { runId: string; delta?: string; done: boolean }) => void) | null,
}));

vi.mock("@shared/api", () => ({
  api: { rag: mocked },
}));

import {
  cleanUpRagStreamListeners,
  createRagChatActions,
} from "../../src/renderer/src/features/research/stores/analysis/actions/ragChatActions.js";

describe("RAG stream frame batching", () => {
  let state: AnalysisActionState;
  let set: AnalysisSet;
  let setSpy: ReturnType<typeof vi.fn>;
  let frameCallback: FrameRequestCallback | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    state = {
      items: [],
      messages: [],
      input: "질문",
      isStreaming: false,
      ragRunId: null,
    };
    setSpy = vi.fn();
    set = (partial) => {
      const next = typeof partial === "function" ? partial(state) : partial;
      Object.assign(state, next);
      setSpy(next);
    };
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frameCallback = callback;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    mocked.ask.mockResolvedValue({ success: true, data: { runId: "run-1" } });
    mocked.onStream.mockImplementation((handler) => {
      mocked.streamHandler = handler;
      return vi.fn();
    });
    mocked.onError.mockReturnValue(vi.fn());
  });

  afterEach(() => {
    cleanUpRagStreamListeners();
    vi.unstubAllGlobals();
  });

  it("같은 프레임의 delta를 한 번의 메시지 갱신으로 합친다", async () => {
    const actions = createRagChatActions(set, () => state);
    await actions.handleSend("project-1", "chapter-1", "current-only");
    setSpy.mockClear();

    mocked.streamHandler?.({ runId: "run-1", delta: "A", done: false });
    mocked.streamHandler?.({ runId: "run-1", delta: "B", done: false });

    expect(setSpy).not.toHaveBeenCalled();
    expect(requestAnimationFrame).toHaveBeenCalledOnce();

    frameCallback?.(0);

    expect(setSpy).toHaveBeenCalledOnce();
    expect(state.messages.at(-1)?.content).toBe("AB");
  });
});
