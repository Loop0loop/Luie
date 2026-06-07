import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Send, Square } from "lucide-react";
import { useToast } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import { ErrorCode } from "@shared/constants/errorCode";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { Button } from "@renderer/components/ui/button";
import {
  type AnalysisConflictItem,
  type AnalysisRagErrorPayload,
  type AnalysisRagStreamPayload,
  type AnalysisRuntimeInfo,
  type AnalysisSidecarStatus,
  type Message,
  type MemoryScope,
  type RuntimePreference,
} from "./analysisSection/types";
import { ConflictQueuePanel } from "./analysisSection/ConflictQueuePanel";
import { MessageList } from "./analysisSection/MessageList";
import { RuntimeStatusPanel } from "./analysisSection/RuntimeStatusPanel";

type ChatChunkItem = {
  chunkId: string;
  chapterId: string | null;
  quote: string;
};

const formatConflictFact = (fact: AnalysisConflictItem["invalidatedFact"]) => {
  const subject = fact.subjectEntityName ?? fact.subjectEntityId;
  const object =
    fact.objectEntityName ?? fact.objectValue ?? fact.objectEntityId ?? fact.subjectEntityId;
  return `${subject} → ${fact.predicate} → ${object} (${fact.status})`;
};

const renderErrorMessage = (payload: AnalysisRagErrorPayload): string =>
  payload.code === ErrorCode.RAG_QA_ABORTED
    ? "요청이 중단되었습니다."
    : payload.message ?? "Error";

export default function AnalysisSection() {
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ragRunId, setRagRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [runtimeInfo, setRuntimeInfo] = useState<AnalysisRuntimeInfo>(null);
  const [runtimePreference, setRuntimePreference] = useState<RuntimePreference>("auto");
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current-only");
  const [sidecarStatus, setSidecarStatus] = useState<AnalysisSidecarStatus>(null);
  const [showConflictQueue, setShowConflictQueue] = useState(false);
  const [conflictItems, setConflictItems] = useState<AnalysisConflictItem[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    void (async () => {
      const all = await api.settings.getAll();
      if (all.success) {
        const provider = all.data?.llm?.preferredProvider;
        if (provider) {
          setRuntimePreference(provider);
        }
      }

      const runtime = await api.settings.getLlmRuntime();
      if (runtime.success && runtime.data) {
        setRuntimeInfo(runtime.data);
      }

      const sidecar = await api.settings.getSidecarStatus();
      if (sidecar.success && sidecar.data) {
        setSidecarStatus(sidecar.data);
      }
    })();
  }, []);

  useEffect(() => {
    return api.settings.onSidecarStatusChanged((event) => {
      if (event.purpose !== "chat") return;
      setSidecarStatus(event.status);
    });
  }, []);

  const applyRuntimePreference = useCallback(
    async (next: RuntimePreference) => {
      const response = await api.settings.setLlmPreference({ provider: next });
      if (!response.success) {
        showToast(response.error?.message ?? "LLM preference 변경 실패", "error");
        return;
      }

      const runtime = await api.settings.getLlmRuntime();
      if (!runtime.success || !runtime.data) {
        return;
      }

      setRuntimeInfo(runtime.data);
      const sidecar = await api.settings.getSidecarStatus();
      if (sidecar.success && sidecar.data) {
        setSidecarStatus(sidecar.data);
      }

      if (runtime.data.resolvedProvider === "unavailable") {
        const reason =
          runtime.data.skipped?.[0]?.message ??
          "선택한 LLM 경로를 사용할 수 없습니다.";
        if (window.confirm(`${reason}\n\n설정 페이지의 모델 탭을 여시겠습니까?`)) {
          window.dispatchEvent(
            new CustomEvent("luie:open-settings", { detail: { tab: "model" } }),
          );
        }
        return;
      }

      setRuntimePreference(next);
      showToast(
        `LLM 경로 변경: ${next} → ${runtime.data.resolvedProvider ?? runtime.data.provider}`,
        "info",
      );
    },
    [showToast],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!showConflictQueue || !currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      setConflictLoading(true);
      setConflictError(null);

      try {
        const response = await api.memory.getConflictQueue({
          projectId: currentProject.id,
          chapterId: currentChapter?.id,
          includePriorMemory: memoryScope === "with-prior",
          limit: 20,
        });
        if (cancelled) return;
        if (!response.success || !response.data) {
          setConflictError(response.error?.message ?? "충돌 큐 조회 실패");
          setConflictItems([]);
          return;
        }
        setConflictItems(response.data.items);
      } finally {
        if (!cancelled) {
          setConflictLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentChapter?.id, currentProject?.id, memoryScope, showConflictQueue]);

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
            ? { ...message, isStreaming: false, error: renderErrorMessage(payload) }
            : message,
        ),
      );
    }, ragRunId);

    return () => {
      offStream();
      offError();
    };
  }, [ragRunId]);

  const handleSend = useCallback(async () => {
    if (!currentProject?.id || !input.trim() || isStreaming) return;

    const question = input.trim();
    const userMessageId = `user-${Date.now()}`;
    const assistantMsgId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: question },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    const res = await api.rag.ask({
      projectId: currentProject.id,
      question,
      chapterId: currentChapter?.id ?? undefined,
      includePriorMemory: memoryScope === "with-prior",
    });

    if (!res.success || !res.data?.runId) {
      setIsStreaming(false);
      const errMsg = res.error?.message ?? "Failed to start";
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
        message.id === assistantMsgId ? { ...message, id: res.data!.runId } : message,
      ),
    );
  }, [currentProject, currentChapter, input, isStreaming, memoryScope, showToast]);

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

  return (
    <div className="flex flex-col h-full bg-panel text-fg">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
        <ConflictQueuePanel
          visible={showConflictQueue}
          loading={conflictLoading}
          error={conflictError}
          items={conflictItems}
          onToggle={() => setShowConflictQueue((prev) => !prev)}
          renderFact={formatConflictFact}
        />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
            <p className="text-sm text-center">
              {currentChapter
                ? `Context: ${currentChapter.title}`
                : "원고 내용에 대해 질문하세요"}
            </p>
          </div>
        )}

        <MessageList messages={messages} onJumpEvidence={handleJumpEvidence} />
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-border p-3 bg-panel">
        <div className="mb-2 flex items-center gap-2 px-1">
          <label htmlFor="analysis-runtime-pref" className="text-[11px] text-muted">
            Route
          </label>
          <select
            id="analysis-runtime-pref"
            value={runtimePreference}
            onChange={(event) => void applyRuntimePreference(event.target.value as RuntimePreference)}
            className="h-7 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="auto">auto</option>
            <optgroup label="Local">
              <option value="sidecar">Sidecar</option>
            </optgroup>
            <optgroup label="Cloud">
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </optgroup>
            <optgroup label="Advanced">
              <option value="ollama">Ollama</option>
            </optgroup>
          </select>

          <label
            htmlFor="analysis-memory-scope"
            className="text-[11px] text-muted ml-1"
          >
            Memory
          </label>
          <select
            id="analysis-memory-scope"
            value={memoryScope}
            onChange={(event) => setMemoryScope(event.target.value as MemoryScope)}
            className="h-7 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="current-only">현재 챕터만</option>
            <option value="with-prior">현재+과거</option>
          </select>
        </div>

        <RuntimeStatusPanel runtimeInfo={runtimeInfo} sidecarStatus={sidecarStatus} />

        {currentChapter && (
          <div className="text-xs text-muted mb-2 flex items-center gap-1.5 font-medium px-1">
            <span>Context: {currentChapter.title}</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 text-sm bg-surface border border-border rounded-xl px-3.5 py-2.5 resize-none text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] max-h-[160px] transition-shadow"
            placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!currentProject}
          />
          <Button
            onClick={isStreaming ? () => void handleStop() : () => void handleSend()}
            disabled={!currentProject || (!isStreaming && !input.trim())}
            size="icon"
            className="shrink-0 h-[44px] w-[44px] rounded-xl shadow-sm disabled:opacity-50"
          >
            {isStreaming ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
