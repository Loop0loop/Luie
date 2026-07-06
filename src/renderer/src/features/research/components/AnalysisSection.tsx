import { useEffect, useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { BookOpen, Bot, Maximize2, Scale, Search, Users } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { MessageList } from "./analysisSection/chat/MessageList";
import { PromptComposer } from "./analysisSection/chat/PromptComposer";
import { NarrativeSummaryStatusPanel } from "./analysisSection/review/summary/NarrativeSummaryStatusPanel";
import { SummaryDrawer } from "./analysisSection/review/summary/SummaryDrawer";
import type { MemoryScope } from "./analysisSection/shared/types";
import { useAnalysisRuntime } from "./analysisSection/runtime/useAnalysisRuntime";
import { useRagChat } from "./analysisSection/chat/useRagChat";
import { useAnalysisStore } from "../stores/analysisStore";

interface FloatingWrapperProps {
  children: React.ReactNode;
  compact?: boolean;
}

function FloatingWrapper({
  children,
  compact = false,
}: FloatingWrapperProps) {
  const { t } = useTranslation();
  const resizeHandleLabel = t("analysis.resizeHandle", "Resize handle");
  const {
    floatingPosition,
    setFloatingPosition,
    floatingSize,
    setFloatingSize,
  } = useAnalysisStore(
    useShallow((state) => ({
      floatingPosition: state.floatingPosition,
      setFloatingPosition: state.setFloatingPosition,
      floatingSize: state.floatingSize,
      setFloatingSize: state.setFloatingSize,
    }))
  );

  const [position, setPosition] = useState(floatingPosition);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (
      (e.target as HTMLElement).closest(
        "button, textarea, input, a, [data-no-drag]",
      )
    )
      return;
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

    const initialLeft = window.innerWidth - floatingSize.width - 24;
    const initialTop = window.innerHeight - floatingSize.height - 96;

    const currentLeft = initialLeft + newX;
    const currentTop = initialTop + newY;

    const clampedLeft = Math.max(0, Math.min(currentLeft, window.innerWidth - floatingSize.width));
    const clampedTop = Math.max(0, Math.min(currentTop, window.innerHeight - floatingSize.height));

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
    setFloatingPosition(position);
  };

  const handleLostPointerCapture = () => {
    isDragging.current = false;
    setIsDraggingState(false);
  };

  const handleResizeStart =
    (dir: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw") =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);

      const MIN_W = 320;
      const MAX_W = 760;
      const MIN_H = 360;
      const MAX_H = 900;
      const clamp = (v: number, min: number, max: number) =>
        Math.max(min, Math.min(max, v));

      const startWidth = floatingSize.width;
      const startHeight = floatingSize.height;
      const startX = e.clientX;
      const startY = e.clientY;

      // 시작 시점의 화면상 좌상단 좌표
      const startLeft = window.innerWidth - startWidth - 24 + position.x;
      const startTop = window.innerHeight - startHeight - 96 + position.y;

      const hasE = dir.includes("e");
      const hasW = dir.includes("w");
      const hasS = dir.includes("s");
      const hasN = dir.includes("n");

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (hasE) newWidth = clamp(startWidth + deltaX, MIN_W, MAX_W);
        if (hasW) {
          newWidth = clamp(startWidth - deltaX, MIN_W, MAX_W);
          newLeft = startLeft + (startWidth - newWidth);
        }
        if (hasS) newHeight = clamp(startHeight + deltaY, MIN_H, MAX_H);
        if (hasN) {
          newHeight = clamp(startHeight - deltaY, MIN_H, MAX_H);
          newTop = startTop + (startHeight - newHeight);
        }

        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - newWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - newHeight));

        setFloatingSize({ width: newWidth, height: newHeight });

        const newInitLeft = window.innerWidth - newWidth - 24;
        const newInitTop = window.innerHeight - newHeight - 96;
        const newPos = { x: newLeft - newInitLeft, y: newTop - newInitTop };
        setPosition(newPos);
        setFloatingPosition(newPos);
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        handle.releasePointerCapture(upEvent.pointerId);
        resizeController.abort();
      };

      const resizeController = new AbortController();
      window.addEventListener("pointermove", onPointerMove, {
        signal: resizeController.signal,
      });
      window.addEventListener("pointerup", onPointerUp, {
        signal: resizeController.signal,
      });
    };

  return (
    <div
      data-testid="analysis-floating-container"
      role="dialog"
      aria-label={t("analysis.title")}
      className={`group fixed bottom-24 right-6 rounded-3xl border border-border/30 bg-panel/80 dark:bg-panel/70 backdrop-blur-xl shadow-panel z-modal flex flex-col overflow-hidden cursor-grab active:cursor-grabbing ${
        isDraggingState ? "transition-none select-none" : "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
      }`}
      style={{
        width: `${floatingSize.width}px`,
        height: compact ? "auto" : `${floatingSize.height}px`,
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <div
        data-testid="analysis-header"
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      />
      <div className={`relative overflow-hidden ${compact ? "shrink-0" : "flex-1"}`}>
        {children}
      </div>

      {/* 전방향 리사이즈 핸들 — 컴팩트(빈 상태)에서는 숨김 */}
      {!compact && (
        <>
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("n")} className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("s")} className="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("e")} className="absolute right-0 top-3 bottom-3 w-1.5 cursor-ew-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("w")} className="absolute left-0 top-3 bottom-3 w-1.5 cursor-ew-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("nw")} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("ne")} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("sw")} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-50" />
          <div role="separator" aria-label={resizeHandleLabel} tabIndex={0} onPointerDown={handleResizeStart("se")} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-50" />
        </>
      )}
    </div>
  );
}

export default function AnalysisSection() {
  const { t } = useTranslation();
  const [sectionTab, setSectionTab] = useState<"chat" | "review">("chat");
  const { currentItem: currentChapter, items: chapters } = useChapterStore(
    useShallow((state) => ({
      currentItem: state.currentItem,
      items: state.items,
    })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current-only");
  const [timelineChapterId, setTimelineChapterId] = useState<string | undefined>();
  const selectedTimelineChapterId =
    timelineChapterId && chapters.some((chapter) => chapter.id === timelineChapterId)
      ? timelineChapterId
      : currentChapter?.id;

  const timelineChapter = useMemo(
    () =>
      chapters.find((chapter) => chapter.id === selectedTimelineChapterId) ??
      currentChapter ??
      null,
    [chapters, currentChapter, selectedTimelineChapterId],
  );
  const timelineChapters = useMemo(
    () =>
      [...chapters]
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
          id: chapter.id,
          order: chapter.order,
          title: chapter.title,
        })),
    [chapters],
  );

  const {
    viewMode,
    setViewMode,
    setMinimized,
    showNarrativeSummaryStatus,
    setShowNarrativeSummaryStatus,
    narrativeSummaryStatus,
    narrativeSummaryStatusLoading,
    narrativeSummaryStatusError,
    loadNarrativeSummaryStatus,
  } = useAnalysisStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      setViewMode: state.setViewMode,
      setMinimized: state.setMinimized,
      showNarrativeSummaryStatus: state.showNarrativeSummaryStatus,
      setShowNarrativeSummaryStatus: state.setShowNarrativeSummaryStatus,
      narrativeSummaryStatus: state.narrativeSummaryStatus,
      narrativeSummaryStatusLoading: state.narrativeSummaryStatusLoading,
      narrativeSummaryStatusError: state.narrativeSummaryStatusError,
      loadNarrativeSummaryStatus: state.loadNarrativeSummaryStatus,
    }))
  );

  const runtime = useAnalysisRuntime();
  const chat = useRagChat({
    projectId: currentProject?.id,
    chapterId: timelineChapter?.id,
    memoryScope,
  });

  useEffect(() => {
    if (showNarrativeSummaryStatus && currentProject) {
      void loadNarrativeSummaryStatus(currentProject.id);
    }
  }, [showNarrativeSummaryStatus, currentProject, loadNarrativeSummaryStatus]);

  const disabled = !currentProject;
  const isEmpty = chat.messages.length === 0;
  const floating = viewMode === "floatingView";
  // 플로팅 + 빈 상태: 프롬프트만 보이는 컴팩트 형태. 대화 시작하면 전체 채팅 창으로 확장.
  const floatingCompact = floating && isEmpty;

  const composer = (
    <PromptComposer
      input={chat.input}
      setInput={chat.setInput}
      isStreaming={chat.isStreaming}
      disabled={disabled}
      onSend={() => void chat.handleSend()}
      onStop={() => void chat.handleStop()}
      onKeyDown={chat.handleKeyDown}
      runtimeInfo={runtime.runtimeInfo}
      sidecarStatus={runtime.sidecarStatus}
      runtimePreference={runtime.runtimePreference}
      onApplyRuntimePreference={(pref) => void runtime.applyRuntimePreference(pref)}
      searchOptimizationMode={runtime.searchOptimizationMode}
      onApplySearchOptimizationMode={(mode) =>
        void runtime.applySearchOptimizationMode(mode)
      }
      memoryScope={memoryScope}
      onChangeMemoryScope={setMemoryScope}
      timelineChapter={
        timelineChapter
          ? { order: timelineChapter.order, title: timelineChapter.title }
          : undefined
      }
      timelineChapters={timelineChapters}
      timelineChapterId={timelineChapter?.id}
      onChangeTimelineChapter={setTimelineChapterId}
      summaryActive={showNarrativeSummaryStatus}
      onToggleSummary={() => setShowNarrativeSummaryStatus((prev) => !prev)}
      floating={floating}
      onMinimize={() => setMinimized(true)}
      onDock={() => {
        setViewMode("fixView");
        setMinimized(false);
      }}
    />
  );

  const renderContent = () => (
    <div
      data-testid="analysis-section-content"
      className={`relative text-fg flex flex-col overflow-hidden ${
        floatingCompact ? "" : "h-full"
      } ${floating ? "bg-transparent" : "bg-panel"}`}
    >
      {/* 탭 헤더 영역 — 컴팩트 뷰가 아닐 때 항상 노출 */}
      {!floatingCompact && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/15 bg-element/5 select-none shrink-0 gap-2">
          {/* 세련된 알약 형태 탭 버튼들 */}
          <div
            role="tablist"
            aria-label={t("analysis.title")}
            className="flex items-center gap-0.5 bg-element/10 border border-border/15 p-0.5 rounded-full text-[11px] font-medium tracking-tight text-muted"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sectionTab === "chat"}
              onClick={() => setSectionTab("chat")}
              className={`rounded-full px-3.5 py-1 transition-colors duration-200 active:scale-95 ${
                sectionTab === "chat"
                  ? "bg-surface text-fg shadow-sm font-semibold"
                  : "hover:text-fg"
              }`}
            >
              {t("analysis.tabs.chat")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sectionTab === "review"}
              onClick={() => setSectionTab("review")}
              className={`rounded-full px-3.5 py-1 flex items-center transition-colors duration-200 active:scale-95 ${
                sectionTab === "review"
                  ? "bg-surface text-fg shadow-sm font-semibold"
                  : "hover:text-fg"
              }`}
            >
              {t("analysis.tabs.review")}
            </button>
          </div>

          {/* 뷰 모드 전환 토글 (고정 뷰일 때만 보임) */}
          {viewMode === "fixView" && (
            <button
              data-testid="view-mode-toggle"
              type="button"
              onClick={() => {
                setViewMode("floatingView");
                setMinimized(false);
              }}
              className="p-1.5 rounded-full hover:bg-surface-hover text-muted hover:text-fg transition-[colors,transform] duration-150 active:scale-90 shrink-0"
              title={t("analysis.viewMode.switchToFloating")}
              aria-label={t("analysis.viewMode.switchToFloating")}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 서사 요약 드로어 (상단 슬라이드 인) */}
      <SummaryDrawer
        open={showNarrativeSummaryStatus}
        loading={narrativeSummaryStatusLoading}
        error={narrativeSummaryStatusError}
        status={narrativeSummaryStatus}
        onClose={() => setShowNarrativeSummaryStatus(false)}
      />

      {/* 본문 콘텐츠 — 탭 분기 */}
      {!floatingCompact && (
        <div data-no-drag className="flex-1 overflow-y-auto px-5 pt-4 min-h-0 cursor-auto custom-scrollbar">
          {sectionTab === "review" ? (
            /* 설정 검토 탭: 서사 요약만 표시 */
            <div className="mb-4">
              <NarrativeSummaryStatusPanel
                visible={showNarrativeSummaryStatus}
                onToggle={() => setShowNarrativeSummaryStatus((prev) => !prev)}
                loading={narrativeSummaryStatusLoading}
                error={narrativeSummaryStatusError}
                status={narrativeSummaryStatus}
              />
            </div>
          ) : (
            /* 채팅 대화 탭: GPT/클로드 대화창 형식 */
            <div className="h-full flex flex-col min-h-0">
              {isEmpty ? (
                /* 빈 상태: 가이드와 4가지 빠른 프롬프트 카드 */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none animate-[fadeIn_0.4s_ease-out]">
                  <div className="w-12 h-12 rounded-2xl bg-element/20 border border-border/10 flex items-center justify-center shadow-sm mb-5">
                    <Bot className="w-5 h-5 text-muted" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-fg/90 mb-2 tracking-tight">
                    {t("analysis.emptyState.title")}
                  </h3>
                  <p className="text-[11px] text-muted max-w-[260px] leading-relaxed mb-6">
                    {t("analysis.emptyState.subtitle")}
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full max-w-[360px]">
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.summaryPrompt"))}
                      className="rounded-2xl border border-border/5 hover:border-accent/20 bg-element/5 hover:bg-element/10 p-4 text-left text-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-98 group"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-muted group-hover:text-accent mb-2 transition-colors" />
                      <div className="font-semibold mb-1 text-fg/80">{t("analysis.emptyState.summaryLabel")}</div>
                      <div className="text-[10px] text-muted line-clamp-2">{t("analysis.emptyState.summaryPrompt")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.relationPrompt"))}
                      className="rounded-2xl border border-border/5 hover:border-accent/20 bg-element/5 hover:bg-element/10 p-4 text-left text-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-98 group"
                    >
                      <Users className="w-3.5 h-3.5 text-muted group-hover:text-accent mb-2 transition-colors" />
                      <div className="font-semibold mb-1 text-fg/80">{t("analysis.emptyState.relationLabel")}</div>
                      <div className="text-[10px] text-muted line-clamp-2">{t("analysis.emptyState.relationPrompt")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.conflictPrompt"))}
                      className="rounded-2xl border border-border/5 hover:border-accent/20 bg-element/5 hover:bg-element/10 p-4 text-left text-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-98 group"
                    >
                      <Scale className="w-3.5 h-3.5 text-muted group-hover:text-accent mb-2 transition-colors" />
                      <div className="font-semibold mb-1 text-fg/80">{t("analysis.emptyState.conflictLabel")}</div>
                      <div className="text-[10px] text-muted line-clamp-2">{t("analysis.emptyState.conflictPrompt")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.foreshadowPrompt"))}
                      className="rounded-2xl border border-border/5 hover:border-accent/20 bg-element/5 hover:bg-element/10 p-4 text-left text-xs transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 active:scale-98 group"
                    >
                      <Search className="w-3.5 h-3.5 text-muted group-hover:text-accent mb-2 transition-colors" />
                      <div className="font-semibold mb-1 text-fg/80">{t("analysis.emptyState.foreshadowLabel")}</div>
                      <div className="text-[10px] text-muted line-clamp-2">{t("analysis.emptyState.foreshadowPrompt")}</div>
                    </button>
                  </div>
                </div>
              ) : (
                /* 메시지가 있을 때는 메시지 리스트 렌더링 */
                <div className="space-y-6 pb-4">
                  <MessageList
                    messages={chat.messages}
                    onJumpEvidence={chat.handleJumpEvidence}
                  />
                  <div ref={chat.bottomRef} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 입력창 — 채팅 탭이거나 플로팅 컴팩트 뷰일 때만 노출 */}
      {(sectionTab === "chat" || floatingCompact) && (
        <div className="px-3 pb-3 pt-2 shrink-0">{composer}</div>
      )}
    </div>
  );

  if (viewMode === "floatingView") {
    return createPortal(
      <FloatingWrapper compact={floatingCompact}>
        {renderContent()}
      </FloatingWrapper>,
      document.body
    );
  }

  return renderContent();
}
