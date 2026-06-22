import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { useAnalysisStore } from "@renderer/features/research/stores/analysisStore";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";
import { api } from "@shared/api";
import type {
  MemoryScope,
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
  const {
    messages,
    input,
    setInput,
    isStreaming,
    handleSend,
    handleStop,
  } = useAnalysisStore(
    useShallow((state) => ({
      messages: state.messages,
      input: state.input,
      setInput: state.setInput,
      isStreaming: state.isStreaming,
      handleSend: state.handleSend,
      handleStop: state.handleStop,
    }))
  );

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSend = useCallback(async () => {
    if (!projectId) return;
    try {
      await handleSend(projectId, chapterId, memoryScope);
    } catch {
      // Error is handled in store
    }
  }, [projectId, chapterId, memoryScope, handleSend]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }
      event.preventDefault();
      void onSend();
    },
    [onSend],
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
    handleSend: onSend,
    handleStop,
    handleKeyDown,
    handleJumpEvidence,
  };
}
