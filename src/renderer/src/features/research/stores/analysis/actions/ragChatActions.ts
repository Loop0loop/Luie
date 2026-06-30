import { api } from "@shared/api";
import type { MemoryScope } from "../../../components/analysisSection/shared/types";
import { normalizeChatError } from "../../../components/analysisSection/chat/chatErrors";
import type {
  AnalysisActions,
  AnalysisGet,
  AnalysisSet,
} from "../analysisStore.types";

let offStream: (() => void) | null = null;
let offError: (() => void) | null = null;

export const cleanUpRagStreamListeners = () => {
  if (offStream) {
    offStream();
    offStream = null;
  }
  if (offError) {
    offError();
    offError = null;
  }
};

export function createRagChatActions(
  set: AnalysisSet,
  get: AnalysisGet,
): Pick<AnalysisActions, "handleSend" | "handleStop"> {
  return {
    handleSend: async (
      projectId: string,
      chapterId: string | undefined,
      memoryScope: MemoryScope,
    ) => {
      const { input, isStreaming } = get();
      const source = input.trim();
      if (!projectId || !source || isStreaming) return;

      const question = source;
      const userMessageId = `user-${Date.now()}`;
      const assistantMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      set((state) => ({
        messages: [
          ...state.messages,
          { id: userMessageId, role: "user", content: question },
          { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
        ],
        input: "",
        isStreaming: true,
      }));

      const res = await api.rag.ask({
        projectId,
        question,
        chapterId,
        includePriorMemory: memoryScope === "with-prior",
      });
      if (!res.success || !res.data?.runId) {
        set({ isStreaming: false });
        const errMsg = normalizeChatError(res.error?.code);
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === assistantMsgId
              ? { ...message, isStreaming: false, error: errMsg }
              : message,
          ),
        }));
        throw new Error(errMsg);
      }

      const runId = res.data.runId;
      set({ ragRunId: runId });
      set((state) => ({
        messages: state.messages.map((message) =>
          message.id === assistantMsgId ? { ...message, id: runId } : message,
        ),
      }));
      cleanUpRagStreamListeners();

      offStream = api.rag.onStream((payload) => {
        if (payload.runId !== runId) return;
        if (payload.delta) {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === runId
                ? { ...message, content: message.content + payload.delta }
                : message,
            ),
          }));
        }

        if (!payload.done) return;
        set({ isStreaming: false, ragRunId: null });
        cleanUpRagStreamListeners();

        if (payload.result) {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === runId
                ? {
                    ...message,
                    content: payload.result?.answer ?? message.content,
                    answerMode: payload.result?.answerMode,
                    evidence: payload.result?.evidence ?? [],
                    grounding: payload.result?.grounding,
                    safety: payload.result?.safety,
                    narrativeMemory: payload.result?.narrativeMemory,
                    isStreaming: false,
                  }
                : message,
            ),
          }));
        }
      }, runId);
      offError = api.rag.onError((payload) => {
        if (payload.runId && payload.runId !== runId) return;
        set({ isStreaming: false, ragRunId: null });
        cleanUpRagStreamListeners();

        const errMsg = normalizeChatError(payload.code);
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === runId
              ? { ...message, isStreaming: false, error: errMsg }
              : message,
          ),
        }));
      }, runId);
    },
    handleStop: async () => {
      const { ragRunId } = get();
      if (!ragRunId) return;

      await api.rag.stop(ragRunId);
      set({ isStreaming: false, ragRunId: null });
      cleanUpRagStreamListeners();
      set((state) => ({
        messages: state.messages.map((message) =>
          message.isStreaming ? { ...message, isStreaming: false } : message,
        ),
      }));
    },
  };
}
