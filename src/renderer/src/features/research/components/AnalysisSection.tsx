import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Send, Square, Plus, Brain, Check, Maximize2, Minimize2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { Button } from "@renderer/components/ui/button";
import { MessageList } from "./analysisSection/MessageList";
import { NarrativeSummaryStatusPanel } from "./analysisSection/NarrativeSummaryStatusPanel";
import { RuntimeStatusPanel } from "./analysisSection/RuntimeStatusPanel";
import type { MemoryScope, RuntimePreference } from "./analysisSection/types";
import { useAnalysisRuntime } from "./analysisSection/useAnalysisRuntime";
import { useMemoryReviewPanels } from "./analysisSection/useMemoryReviewPanels";
import { useRagChat } from "./analysisSection/useRagChat";
import { useAnalysisStore } from "../stores/analysisStore";

interface FloatingWrapperProps {
  children: React.ReactNode;
  setViewMode: (mode: "fixView" | "floatingView") => void;
}

function FloatingWrapper({ children, setViewMode }: FloatingWrapperProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const header = e.currentTarget;
    header.setPointerCapture(e.pointerId);
    isDragging.current = true;
    setIsDraggingState(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;

    const initialLeft = window.innerWidth - 380 - 24;
    const initialTop = window.innerHeight - 520 - 96;

    const currentLeft = initialLeft + newX;
    const currentTop = initialTop + newY;

    const clampedLeft = Math.max(0, Math.min(currentLeft, window.innerWidth - 380));
    const clampedTop = Math.max(0, Math.min(currentTop, window.innerHeight - 520));

    setPosition({
      x: clampedLeft - initialLeft,
      y: clampedTop - initialTop,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const header = e.currentTarget;
    header.releasePointerCapture(e.pointerId);
    isDragging.current = false;
    setIsDraggingState(false);
  };

  const handleLostPointerCapture = () => {
    isDragging.current = false;
    setIsDraggingState(false);
  };

  return (
    <div
      data-testid="analysis-floating-container"
      className={`fixed bottom-24 right-6 w-[380px] h-[520px] rounded-2xl border border-border shadow-panel backdrop-blur-md bg-panel/80 z-[9999] flex flex-col overflow-hidden ${
        isDraggingState ? "transition-none" : "transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
      }`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      <div
        data-testid="analysis-header"
        className="flex items-center justify-between px-4 py-3 border-b border-border/40 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onLostPointerCapture={handleLostPointerCapture}
      >
        <span className="text-sm font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          원고 분석 (미니)
        </span>
        <button
          data-testid="view-mode-toggle"
          onClick={() => setViewMode("fixView")}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg hover:bg-active text-muted hover:text-fg transition-colors"
          title="고정 뷰로 전환"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}

export default function AnalysisSection() {
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current-only");

  const { viewMode, setViewMode } = useAnalysisStore(
    useShallow((state) => ({ viewMode: state.viewMode, setViewMode: state.setViewMode }))
  );

  const [showLlmPopover, setShowLlmPopover] = useState(false);
  const [showMemoryPopover, setShowMemoryPopover] = useState(false);

  const llmRef = useRef<HTMLDivElement>(null);
  const memoryRef = useRef<HTMLDivElement>(null);

  const runtime = useAnalysisRuntime();
  const chat = useRagChat({
    projectId: currentProject?.id,
    chapterId: currentChapter?.id,
    memoryScope,
  });
  const review = useMemoryReviewPanels({
    projectId: currentProject?.id,
    chapterId: currentChapter?.id,
    memoryScope,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (llmRef.current && !llmRef.current.contains(event.target as Node)) {
        setShowLlmPopover(false);
      }
      if (memoryRef.current && !memoryRef.current.contains(event.target as Node)) {
        setShowMemoryPopover(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const renderContent = () => (
    <div
      data-testid="analysis-section-content"
      className="relative h-full bg-panel text-fg flex flex-col overflow-hidden"
    >
      {/* fixView 모드일 때만 고정 헤더와 토글 버튼 렌더링 */}
      {viewMode === "fixView" && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 select-none">
          <span className="text-sm font-semibold flex items-center gap-1.5">
            원고 분석
          </span>
          <button
            data-testid="view-mode-toggle"
            onClick={() => setViewMode("floatingView")}
            className="p-1.5 rounded-lg hover:bg-active text-muted hover:text-fg transition-colors"
            title="플로팅 뷰로 전환"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 메시지 및 서사 요약 영역 */}
      <div className="h-full overflow-y-auto px-4 pt-4 pb-48 space-y-5 min-h-0">
        <NarrativeSummaryStatusPanel
          visible={review.showNarrativeSummaryStatus}
          loading={review.narrativeSummaryStatusLoading}
          error={review.narrativeSummaryStatusError}
          status={review.narrativeSummaryStatus}
          onToggle={() => review.setShowNarrativeSummaryStatus((prev) => !prev)}
        />

        {chat.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted gap-3">
            <p className="text-sm text-center">
              {currentChapter
                ? `Context: ${currentChapter.title}`
                : "원고 내용에 대해 질문하세요"}
            </p>
          </div>
        )}

        <MessageList
          messages={chat.messages}
          onJumpEvidence={chat.handleJumpEvidence}
        />
        <div ref={chat.bottomRef} />
      </div>

      {/* 플로팅 리퀴드 스타일 입력창 카드 */}
      <div className="absolute bottom-4 left-4 right-4 bg-surface/90 backdrop-blur-md border border-border shadow-panel rounded-2xl p-3 z-overlay flex flex-col gap-2 transition-shadow">
        {/* 런타임 상태 간략 표시 영역 */}
        {runtime.runtimeInfo && (
          <div className="border-b border-border/40 pb-2">
            <RuntimeStatusPanel
              runtimeInfo={runtime.runtimeInfo}
              sidecarStatus={runtime.sidecarStatus}
            />
          </div>
        )}

        <textarea
          className="w-full text-sm bg-transparent border-none resize-none text-fg placeholder:text-muted focus:outline-none min-h-[44px] max-h-[120px]"
          placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
          value={chat.input}
          onChange={(event) => chat.setInput(event.target.value)}
          onKeyDown={chat.handleKeyDown}
          rows={1}
          disabled={!currentProject}
        />

        {/* 하단 툴바 */}
        <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
          <div className="flex items-center gap-2">
            {/* Route 선택 (+) 버튼 */}
            <div className="relative" ref={llmRef}>
              <button
                type="button"
                onClick={() => {
                  setShowLlmPopover((prev) => !prev);
                  setShowMemoryPopover(false);
                }}
                className="flex h-7 px-2 items-center justify-center gap-1.5 rounded-full bg-panel/60 border border-border hover:bg-active text-muted hover:text-fg transition-colors text-xs font-medium"
                title="LLM Route 선택"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{getLlmPreferenceLabel(runtime.runtimePreference)}</span>
              </button>

              {showLlmPopover && (
                <div className="absolute bottom-9 left-0 w-44 rounded-xl border border-border bg-surface shadow-modal py-1 z-dropdown">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted/80 tracking-wider uppercase">
                    LLM Route
                  </div>
                  <div className="h-[1px] bg-border/60 my-1" />
                  {(["auto", "sidecar", "ollama", "openai", "gemini"] as const).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        void runtime.applyRuntimePreference(pref);
                        setShowLlmPopover(false);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-active flex items-center justify-between text-fg"
                    >
                      <span>{getLlmPreferenceLabel(pref)}</span>
                      {runtime.runtimePreference === pref && (
                        <Check className="w-3.5 h-3.5 text-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Memory 선택 (Brain) 버튼 */}
            <div className="relative" ref={memoryRef}>
              <button
                type="button"
                onClick={() => {
                  setShowMemoryPopover((prev) => !prev);
                  setShowLlmPopover(false);
                }}
                className={`flex h-7 px-2 items-center justify-center gap-1.5 rounded-full border transition-colors text-xs font-medium ${
                  memoryScope === "with-prior"
                    ? "bg-accent/15 border-accent/30 text-accent hover:bg-accent/25"
                    : "bg-panel/60 border-border text-muted hover:bg-active hover:text-fg"
                }`}
                title="Memory 범위 선택"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>
                  {memoryScope === "with-prior" ? "현재+과거" : "현재만"}
                </span>
              </button>

              {showMemoryPopover && (
                <div className="absolute bottom-9 left-0 w-40 rounded-xl border border-border bg-surface shadow-modal py-1 z-dropdown">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-muted/80 tracking-wider uppercase">
                    Memory Scope
                  </div>
                  <div className="h-[1px] bg-border/60 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMemoryScope("current-only");
                      setShowMemoryPopover(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-active flex items-center justify-between text-fg"
                  >
                    <span>현재 챕터만</span>
                    {memoryScope === "current-only" && (
                      <Check className="w-3.5 h-3.5 text-accent" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMemoryScope("with-prior");
                      setShowMemoryPopover(false);
                    }}
                    className="w-full px-2.5 py-1.5 text-xs text-left hover:bg-active flex items-center justify-between text-fg"
                  >
                    <span>현재 + 과거</span>
                    {memoryScope === "with-prior" && (
                      <Check className="w-3.5 h-3.5 text-accent" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Context 챕터 이름 표시 */}
            {currentChapter && (
              <span className="text-[11px] text-muted max-w-[120px] truncate ml-1 font-medium">
                Context: {currentChapter.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              onClick={
                chat.isStreaming
                  ? () => void chat.handleStop()
                  : () => void chat.handleSend()
              }
              disabled={
                !currentProject || (!chat.isStreaming && !chat.input.trim())
              }
              size="icon"
              className="h-8 w-8 rounded-full shadow-sm disabled:opacity-50"
            >
              {chat.isStreaming ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (viewMode === "floatingView") {
    return createPortal(
      <FloatingWrapper setViewMode={setViewMode}>
        {renderContent()}
      </FloatingWrapper>,
      document.body
    );
  }

  return renderContent();
}

function getLlmPreferenceLabel(pref: RuntimePreference): string {
  switch (pref) {
    case "auto":
      return "Auto";
    case "sidecar":
      return "Local (Sidecar)";
    case "ollama":
      return "Local (Ollama)";
    case "openai":
      return "GPT (OpenAI)";
    case "gemini":
      return "Gemini";
    default:
      return pref;
  }
}
