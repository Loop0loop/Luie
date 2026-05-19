import { useState, useEffect, useRef, useCallback } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";
import { Send, Square, ChevronDown, Bot, User, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import type { RagQaErrorPayload, RagQaStreamPayload, LlmModelSettingsView } from "@shared/types";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence?: Array<{ chunkId: string; chapterId: string | null; offset: number; quote: string }>;
  isStreaming?: boolean;
  error?: string;
};

const PROVIDER_OPTIONS = [
  { value: "llamaserver" as const, label: "llama-server (GPU)" },
  { value: "llamacpp" as const, label: "llama.cpp (CPU)" },
  { value: "none" as const, label: "Deterministic" },
];

export default function AnalysisSection() {
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);

  // Model config state
  const [modelView, setModelView] = useState<LlmModelSettingsView | null>(null);
  const [providerHint, setProviderHint] = useState<"llamacpp" | "llamaserver" | "none">("llamaserver");
  const [configLoading, setConfigLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [ragRunId, setRagRunId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  // Load model list on mount
  useEffect(() => {
    void api.settings.getLlmModels().then((res) => {
      if (res.success && res.data) setModelView(res.data);
    });
  }, []);

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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ragRunId ? { ...m, isStreaming: false, error: payload.message ?? "Error" } : m,
        ),
      );
    }, ragRunId);

    return () => {
      offStream();
      offError();
    };
  }, [ragRunId]);

  const handleSelectModel = useCallback(async (modelPath: string) => {
    setConfigLoading(true);
    const res = await api.settings.setLlmDefaultModel({ modelPath });
    setConfigLoading(false);
    if (res.success && res.data) setModelView(res.data);
  }, []);

  const handleSelectProvider = useCallback(async (hint: "llamacpp" | "llamaserver" | "none") => {
    setProviderHint(hint);
    await api.settings.setLlmProviderHint({ providerHint: hint });
  }, []);

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
  }, [currentProject?.id, currentChapter?.id, input, isStreaming, showToast]);

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

  const defaultModel = modelView?.models.find((m) => m.isDefault) ?? modelView?.models[0] ?? null;

  return (
    <div className="flex flex-col h-full bg-bg-panel text-text-primary">
      {/* Config bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle shrink-0">
        {/* Model selector */}
        <div className="relative flex-1 min-w-0">
          <select
            className="w-full text-xs bg-bg-elevated border border-border-subtle rounded px-2 py-1 pr-6 appearance-none text-text-primary cursor-pointer truncate"
            value={defaultModel?.path ?? ""}
            onChange={(e) => void handleSelectModel(e.target.value)}
            disabled={configLoading || !modelView?.models.length}
          >
            {!modelView && <option value="">Loading models...</option>}
            {modelView?.models.length === 0 && <option value="">No models found</option>}
            {modelView?.models.map((m) => (
              <option key={m.path} value={m.path}>
                {m.fileName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
        </div>

        {/* Provider selector */}
        <div className="relative shrink-0">
          <select
            className="text-xs bg-bg-elevated border border-border-subtle rounded px-2 py-1 pr-6 appearance-none text-text-primary cursor-pointer"
            value={providerHint}
            onChange={(e) => void handleSelectProvider(e.target.value as typeof providerHint)}
            disabled={configLoading}
          >
            {PROVIDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
            <Bot className="w-8 h-8 opacity-40" />
            <p className="text-xs text-center opacity-60">
              {currentChapter
                ? `Context: ${currentChapter.title}`
                : "원고 내용에 대해 질문하세요"}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-accent-primary" />
              </div>
            )}

            <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div
                className={`text-xs rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent-primary/15 text-text-primary ml-auto"
                    : "bg-bg-elevated text-text-primary"
                }`}
              >
                {msg.error ? (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {msg.error}
                  </span>
                ) : (
                  <>
                    {msg.content}
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-text-primary opacity-70 ml-0.5 animate-pulse align-middle" />
                    )}
                  </>
                )}
              </div>

              {/* Evidence */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {msg.evidence.map((ev) => (
                    <button
                      key={ev.chunkId}
                      onClick={() => void handleJumpEvidence(ev)}
                      className="flex items-start gap-1 text-[10px] text-text-muted hover:text-text-secondary w-full text-left group"
                    >
                      <BookOpen className="w-3 h-3 mt-0.5 shrink-0 group-hover:text-accent-primary" />
                      <span className="truncate">{ev.quote}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-5 h-5 rounded-full bg-bg-elevated flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-text-muted" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border-subtle px-3 py-2">
        {currentChapter && (
          <div className="text-[10px] text-text-muted mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>Context: {currentChapter.title}</span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            className="flex-1 text-xs bg-bg-elevated border border-border-subtle rounded px-2.5 py-2 resize-none text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 min-h-[36px] max-h-[120px]"
            placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!currentProject}
          />
          <button
            onClick={isStreaming ? () => void handleStop() : () => void handleSend()}
            disabled={!currentProject || (!isStreaming && !input.trim())}
            className="shrink-0 w-8 h-8 rounded flex items-center justify-center bg-accent-primary hover:bg-accent-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            {isStreaming ? <Square className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
