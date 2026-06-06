import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";
import { Send, Square, Bot, User, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import type {
  LlmRuntimeInfo,
  RagQaErrorPayload,
  RagQaStreamPayload,
  UtilitySidecarStatus,
} from "@shared/types";
import { ErrorCode } from "@shared/constants/errorCode";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";
import { Button } from "@renderer/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: Array<{ chunkId: string; chapterId: string | null; offset: number; quote: string }>;
  isStreaming?: boolean;
  error?: string;
};

type RuntimePreference = "auto" | "sidecar" | "ollama" | "openai" | "gemini";

const runtimeLabel = (value: string | null | undefined): string => {
  if (!value) return "none";
  if (value === "sidecar") return "Sidecar";
  if (value === "openai") return "OpenAI";
  if (value === "gemini") return "Gemini";
  if (value === "ollama") return "Ollama";
  if (value === "deterministic") return "Deterministic";
  if (value === "unavailable") return "Unavailable";
  return value;
};

const runtimeSummary = (runtime: LlmRuntimeInfo): string => {
  const requested = runtimeLabel(runtime.requestedProvider ?? runtime.provider);
  const resolved = runtimeLabel(runtime.resolvedProvider ?? runtime.provider);
  const backend = runtime.backend ? ` / ${runtime.backend}` : "";
  const fallback = runtime.fallbackUsed ? " / fallback" : "";
  return `Requested: ${requested} / Resolved: ${resolved}${backend}${fallback}`;
};

const sidecarStatusSummary = (status: UtilitySidecarStatus): string => {
  if (status.status === "running") return `Sidecar: running / ${status.baseUrl}`;
  if (status.status === "starting") return "Sidecar: starting";
  if (status.status === "stopping") return "Sidecar: stopping";
  if (status.status === "crashed") return `Sidecar: crashed / ${status.lastError}`;
  if (status.status === "cooldown") return `Sidecar: cooldown / ${status.lastError}`;
  return status.lastError ? `Sidecar: stopped / ${status.lastError}` : "Sidecar: stopped";
};

export default function AnalysisSection() {
  const { t } = useTranslation();
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ragRunId, setRagRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [runtimeInfo, setRuntimeInfo] = useState<LlmRuntimeInfo | null>(null);
  const [runtimePreference, setRuntimePreference] = useState<RuntimePreference>("auto");
  const [sidecarStatus, setSidecarStatus] = useState<UtilitySidecarStatus | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      const res = await api.settings.getLlmRuntime();
      if (res.success && res.data) {
        setRuntimeInfo(res.data);
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

  const applyRuntimePreference = useCallback(async (next: RuntimePreference) => {
    const allSettings = await api.settings.getAll();
    const llmSettings = allSettings.data?.llm;
    const localLlm = llmSettings?.localLlm;

    let isAvailable = true;

    if (next === "openai") {
      const hasKey = Boolean(llmSettings?.openaiApiKey);
      if (!hasKey) {
        isAvailable = false;
      }
    } else if (next === "gemini") {
      const hasKey = Boolean(llmSettings?.geminiApiKey);
      if (!hasKey) {
        isAvailable = false;
      }
    } else if (next === "sidecar") {
      const hasModel = Boolean(localLlm?.modelPath);
      if (!hasModel) {
        isAvailable = false;
      }
    }

    if (!isAvailable) {
      const confirmed = window.confirm(
        t("settings.localLlm.apiKeys.missingAlert.message")
      );
      if (confirmed) {
        window.dispatchEvent(
          new CustomEvent("luie:open-settings", { detail: { tab: "model" } })
        );
      }
      return;
    }

    setRuntimePreference(next);
    const response = await api.settings.setLlmPreference({ provider: next });
    if (!response.success) {
      showToast(response.error?.message ?? "LLM preference 변경 실패", "error");
      return;
    }
    const runtime = await api.settings.getLlmRuntime();
    if (runtime.success && runtime.data) {
      setRuntimeInfo(runtime.data);
      showToast(`LLM 경로 변경: ${next} → ${runtime.data.resolvedProvider ?? runtime.data.provider}`, "info");
    }
    const sidecar = await api.settings.getSidecarStatus();
    if (sidecar.success && sidecar.data) {
      setSidecarStatus(sidecar.data);
    }
  }, [showToast, t]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // RAG stream listener
  useEffect(() => {
    if (!ragRunId) return;

    const offStream = api.rag.onStream((payload: RagQaStreamPayload) => {
      if (payload.runId !== ragRunId) return;
      if (payload.delta) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === ragRunId ? { ...m, content: m.content + payload.delta } : m,
          ),
        );
      }
      if (payload.done) {
        setIsStreaming(false);
        setRagRunId(null);
        if (payload.result) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === ragRunId
                ? {
                  ...m,
                  content: payload.result?.answer ?? m.content,
                  evidence: payload.result?.evidence ?? [],
                  isStreaming: false,
                }
                : m,
            ),
          );
        }
      }
    }, ragRunId);

    const offError = api.rag.onError((payload: RagQaErrorPayload) => {
      if (payload.runId && payload.runId !== ragRunId) return;
      setIsStreaming(false);
      setRagRunId(null);
      const isAborted = payload.code === ErrorCode.RAG_QA_ABORTED;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ragRunId
            ? {
              ...m,
              isStreaming: false,
              error: isAborted ? "요청이 중단되었습니다." : (payload.message ?? "Error"),
            }
            : m,
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
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `${Date.now() + 1}-${Math.random().toString(36).slice(2, 9)}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: question },
      { id: assistantMsgId, role: "assistant", content: "", isStreaming: true },
    ]);
    setInput("");
    setIsStreaming(true);

    const res = await api.rag.ask({
      projectId: currentProject.id,
      question,
      chapterId: currentChapter?.id ?? undefined,
    });

    if (!res.success || !res.data?.runId) {
      setIsStreaming(false);
      const errMsg = res.error?.message ?? "Failed to start";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId ? { ...m, isStreaming: false, error: errMsg } : m,
        ),
      );
      showToast(errMsg, "error");
      return;
    }

    // Update assistant message id to match runId for stream matching
    setRagRunId(res.data.runId);
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantMsgId ? { ...m, id: res.data!.runId } : m)),
    );
  }, [currentProject, currentChapter, input, isStreaming, showToast]);

  const handleStop = useCallback(async () => {
    if (ragRunId) await api.rag.stop(ragRunId);
    setIsStreaming(false);
    setRagRunId(null);
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    );
  }, [ragRunId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  const handleJumpEvidence = useCallback(
    async (item: { chunkId: string; chapterId: string | null; quote: string }) => {
      if (!item.chapterId) return;
      await api.memory.getChunkBacklink(item.chunkId);
      requestChapterNavigation({
        chapterId: item.chapterId,
        query: item.quote?.trim().slice(0, 48),
      });
    },
    [],
  );

  return (
    <div className="flex flex-col h-full bg-panel text-fg">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
            <div className="p-3 rounded-full bg-surface border border-border">
              <Bot className="w-6 h-6 opacity-50" />
            </div>
            <p className="text-sm text-center">
              {currentChapter
                ? `Context: ${currentChapter.title}`
                : "원고 내용에 대해 질문하세요"}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-accent" />
              </div>
            )}

            <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div
                className={`text-sm rounded-xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${msg.role === "user"
                    ? "bg-accent/10 text-fg ml-auto border border-accent/20"
                    : "bg-surface text-fg border border-border"
                  }`}
              >
                {msg.error ? (
                  <span className="flex items-center gap-1.5 text-red-500 font-medium">
                    <AlertCircle className="w-4 h-4" />
                    {msg.error}
                  </span>
                ) : (
                  <>
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-fg opacity-70 ml-1 animate-pulse align-middle" />
                    )}
                  </>
                )}
              </div>

              {/* Evidence */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {msg.evidence.map((ev) => (
                    <button
                      key={ev.chunkId}
                      onClick={() => void handleJumpEvidence(ev)}
                      className="flex items-start gap-1.5 text-xs text-muted hover:text-fg w-full text-left group transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 group-hover:text-accent transition-colors" />
                      <span className="truncate">{ev.quote}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border p-3 bg-panel">
        <div className="mb-2 flex items-center gap-2 px-1">
          <label htmlFor="analysis-runtime-pref" className="text-[11px] text-muted">Route</label>
          <select
            id="analysis-runtime-pref"
            value={runtimePreference}
            onChange={(e) => void applyRuntimePreference(e.target.value as RuntimePreference)}
            className="h-7 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="auto">auto</option>
            <option value="sidecar">Sidecar</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="ollama">Ollama</option>
          </select>
        </div>
        {runtimeInfo && (
          <div className="text-[11px] text-muted mb-2 px-1 space-y-1">
            <div>
              {runtimeSummary(runtimeInfo)}
              {runtimeInfo.model ? ` / ${runtimeInfo.model}` : ""}
              {runtimeInfo.alternativeModel ? ` (alt: ${runtimeInfo.alternativeModel})` : ""}
            </div>
            {runtimeInfo.skipped && runtimeInfo.skipped.length > 0 && (
              <div className="truncate">
                Skipped:{" "}
                {runtimeInfo.skipped
                  .map((skip) => `${runtimeLabel(skip.provider)} ${skip.code}`)
                  .join(", ")}
              </div>
            )}
            {sidecarStatus && (
              <div className="truncate">
                {sidecarStatusSummary(sidecarStatus)}
              </div>
            )}
          </div>
        )}
        {currentChapter && (
          <div className="text-xs text-muted mb-2 flex items-center gap-1.5 font-medium px-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Context: {currentChapter.title}</span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 text-sm bg-surface border border-border rounded-xl px-3.5 py-2.5 resize-none text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] max-h-[160px] transition-shadow"
            placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
