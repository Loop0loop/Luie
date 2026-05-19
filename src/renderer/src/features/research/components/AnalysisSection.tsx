import { useState, useEffect, useRef, useCallback } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";
import { Send, Square, ChevronDown, Bot, User, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@shared/ui/ToastContext";
import { api } from "@shared/api";
import type { RagQaErrorPayload, RagQaStreamPayload, LlmModelSettingsView } from "@shared/types";
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

  const handleSelectModel = useCallback(async (modelPath: string) => {
    setConfigLoading(true);
    const [res] = await Promise.all([
      api.settings.setLlmDefaultModel({ modelPath }),
      currentProject?.id
        ? api.settings.setProjectLlm({ projectId: currentProject.id, modelPath })
        : Promise.resolve(null),
    ]);
    setConfigLoading(false);
    if (res.success && res.data) setModelView(res.data);
  }, [currentProject]);

  const handleSelectProvider = useCallback(async (hint: "llamacpp" | "llamaserver" | "none") => {
    setProviderHint(hint);
    await Promise.all([
      api.settings.setLlmProviderHint({ providerHint: hint }),
      currentProject?.id
        ? api.settings.setProjectLlm({ projectId: currentProject.id, providerHint: hint })
        : Promise.resolve(null),
    ]);
  }, [currentProject]);

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

  const defaultModel = modelView?.models.find((m) => m.isDefault) ?? modelView?.models[0] ?? null;

  return (
    <div className="flex flex-col h-full bg-panel text-fg">
      {/* Config bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        {/* Model selector */}
        <div className="relative flex-1 min-w-0">
          <select
            className="w-full text-xs bg-surface border border-border rounded-lg px-2 py-1.5 pr-6 appearance-none text-fg cursor-pointer truncate focus:outline-none focus:ring-1 focus:ring-accent"
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
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
        </div>

        {/* Provider selector */}
        <div className="relative shrink-0">
          <select
            className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5 pr-6 appearance-none text-fg cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent"
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
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
        </div>
      </div>

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
                className={`text-sm rounded-xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${
                  msg.role === "user"
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
