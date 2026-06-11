import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { api } from "@shared/api";
import { useToast } from "@shared/ui/ToastContext";
import { normalizeChatError } from "./chatErrors";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";
import type {
  AnalysisRagErrorPayload,
  AnalysisRagStreamPayload,
  MemoryScope,
  Message,
} from "../shared/types";

type ChatChunkItem = {
  chunkId: string;
  chapterId: string | null;
  quote: string;
};

type UseRagChatInput = {
  projectId?: string;
  chapterId?: string;
  memoryScope: MemoryScope;
};

export function useRagChat({
  projectId,
  chapterId,
  memoryScope,
}: UseRagChatInput) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ragRunId, setRagRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!ragRunId) {
      return;
    }

    const offStream = api.rag.onStream((payload: AnalysisRagStreamPayload) => {
      if (payload.runId !== ragRunId) return;

      if (payload.delta) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === ragRunId
              ? { ...message, content: message.content + payload.delta }
              : message,
          ),
        );
      }

      if (!payload.done) {
        return;
      }

      setIsStreaming(false);
      setRagRunId(null);

      if (payload.result) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === ragRunId
              ? {
                  ...message,
                  content: payload.result?.answer ?? message.content,
                  evidence: payload.result?.evidence ?? [],
                  grounding: payload.result?.grounding,
                  safety: payload.result?.safety,
                  narrativeMemory: payload.result?.narrativeMemory,
                  isStreaming: false,
                }
              : message,
          ),
        );
      }
    }, ragRunId);

    const offError = api.rag.onError((payload: AnalysisRagErrorPayload) => {
      if (payload.runId && payload.runId !== ragRunId) return;
      setIsStreaming(false);
      setRagRunId(null);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === ragRunId
            ? {
                ...message,
                isStreaming: false,
                error: normalizeChatError(payload.code),
              }
            : message,
        ),
      );
    }, ragRunId);

    return () => {
      offStream();
      offError();
    };
  }, [ragRunId]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const source = (overrideText ?? input).trim();
    if (!projectId || !source || isStreaming) return;

    const question = source;
    const userMessageId = `user-${Date.now()}`;
    const assistantMsgId = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: question },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    const res = await api.rag.ask({
      projectId,
      question,
      chapterId,
      includePriorMemory: memoryScope === "with-prior",
    });

    if (!res.success || !res.data?.runId) {
      setIsStreaming(false);
      const errMsg = normalizeChatError(res.error?.code);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantMsgId
            ? { ...message, isStreaming: false, error: errMsg }
            : message,
        ),
      );
      showToast(errMsg, "error");
      return;
    }

    setRagRunId(res.data.runId);
    setMessages((prev) =>
      prev.map((message) =>
        message.id === assistantMsgId
          ? { ...message, id: res.data!.runId }
          : message,
      ),
    );
  }, [projectId, chapterId, input, isStreaming, memoryScope, showToast]);

  const handleStop = useCallback(async () => {
    if (!ragRunId) return;
    await api.rag.stop(ragRunId);
    setIsStreaming(false);
    setRagRunId(null);
    setMessages((prev) =>
      prev.map((message) =>
        message.isStreaming ? { ...message, isStreaming: false } : message,
      ),
    );
  }, [ragRunId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }
      event.preventDefault();
      void handleSend();
    },
    [handleSend],
  );

  const handleJumpEvidence = useCallback(async (item: ChatChunkItem) => {
    if (!item.chapterId) {
      return;
    }
    await api.memory.getChunkBacklink(item.chunkId);
    requestChapterNavigation({
      chapterId: item.chapterId,
      query: item.quote?.trim().slice(0, 48),
    });
  }, []);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    bottomRef,
    handleSend,
    handleStop,
    handleKeyDown,
    handleJumpEvidence,
  };
}
