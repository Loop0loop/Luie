import { useMemo, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Bot, Maximize2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { MessageList } from "./analysisSection/chat/MessageList";
import { PromptComposer } from "./analysisSection/chat/PromptComposer";
import { ConflictQueuePanel } from "./analysisSection/review/queue/ConflictQueuePanel";
import { EntityAliasReviewPanel } from "./analysisSection/review/queue/EntityAliasReviewPanel";
import { EntityReviewPanel } from "./analysisSection/review/queue/EntityReviewPanel";
import { EpisodeReviewPanel } from "./analysisSection/review/queue/EpisodeReviewPanel";
import { FactReviewPanel } from "./analysisSection/review/queue/FactReviewPanel";
import { StaleEvidenceReviewPanel } from "./analysisSection/review/queue/StaleEvidenceReviewPanel";
import { MemoryEvalReportPanel } from "./analysisSection/review/evaluation/MemoryEvalReportPanel";
import { SummaryDrawer } from "./analysisSection/review/summary/SummaryDrawer";
import type { MemoryScope } from "./analysisSection/shared/types";
import type { AnalysisConflictItem } from "./analysisSection/shared/types";
import { useAnalysisRuntime } from "./analysisSection/runtime/useAnalysisRuntime";
import { useMemoryEvalPanel } from "./analysisSection/review/evaluation/useMemoryEvalPanel";
import { useMemoryReviewQueues } from "./analysisSection/review/queue/useMemoryReviewQueues";
import { useRagChat } from "./analysisSection/chat/useRagChat";
import { useAnalysisStore } from "../stores/analysisStore";

const formatConflictFact = (
  fact: AnalysisConflictItem["invalidatedFact"],
): string => {
  const subject = fact.subjectEntityName ?? fact.subjectEntityId;
  const object =
    fact.objectEntityName ?? fact.objectValue ?? fact.objectEntityId ?? "";
  return `${subject} -> ${fact.predicate}${object ? ` -> ${object}` : ""}`;
};

interface FloatingWrapperProps {
  children: React.ReactNode;
  compact?: boolean;
}

function FloatingWrapper({ children, compact = false }: FloatingWrapperProps) {
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
      className={`group fixed bottom-24 right-6 rounded-3xl border border-border/30 bg-panel/80 dark:bg-panel/70 backdrop-blur-xl shadow-panel z-modal flex flex-col overflow-hidden cursor-grab active:cursor-grabbing ${
        isDraggingState ? "transition-none" : "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
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
          <div onPointerDown={handleResizeStart("n")} className="absolute top-0 left-3 right-3 h-1.5 cursor-ns-resize z-50" />
          <div onPointerDown={handleResizeStart("s")} className="absolute bottom-0 left-3 right-3 h-1.5 cursor-ns-resize z-50" />
          <div onPointerDown={handleResizeStart("e")} className="absolute right-0 top-3 bottom-3 w-1.5 cursor-ew-resize z-50" />
          <div onPointerDown={handleResizeStart("w")} className="absolute left-0 top-3 bottom-3 w-1.5 cursor-ew-resize z-50" />
          <div onPointerDown={handleResizeStart("nw")} className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-50" />
          <div onPointerDown={handleResizeStart("ne")} className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={handleResizeStart("sw")} className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-50" />
          <div onPointerDown={handleResizeStart("se")} className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-50" />
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

  const { viewMode, setViewMode, setMinimized } = useAnalysisStore(
    useShallow((state) => ({
      viewMode: state.viewMode,
      setViewMode: state.setViewMode,
      setMinimized: state.setMinimized,
    }))
  );

  const runtime = useAnalysisRuntime();
  const chat = useRagChat({
    projectId: currentProject?.id,
    chapterId: timelineChapter?.id,
    memoryScope,
  });
  const review = useMemoryReviewQueues({
    projectId: currentProject?.id,
    chapterId: timelineChapter?.id,
    memoryScope,
  });
  const evalPanel = useMemoryEvalPanel({
    projectId: currentProject?.id,
  });

  const reviewCount =
    (review.conflictQueueItems?.length ?? 0) +
    (review.factReviewItems?.length ?? 0) +
    (review.episodeReviewItems?.length ?? 0) +
    (review.entityReviewItems?.length ?? 0) +
    (review.entityAliasReviewItems?.length ?? 0) +
    (review.staleEvidenceReviewItems?.length ?? 0);

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
      summaryActive={review.showNarrativeSummaryStatus}
      onToggleSummary={() =>
        review.setShowNarrativeSummaryStatus((prev) => !prev)
      }
      floating={floating}
      onMinimize={() => setMinimized(true)}
      onDock={() => setViewMode("fixView")}
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
          <div className="flex items-center gap-0.5 bg-element/10 border border-border/15 p-0.5 rounded-full text-[11px] font-medium tracking-tight text-muted">
            <button
              type="button"
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
              onClick={() => setSectionTab("review")}
              className={`rounded-full px-3.5 py-1 flex items-center transition-colors duration-200 active:scale-95 ${
                sectionTab === "review"
                  ? "bg-surface text-fg shadow-sm font-semibold"
                  : "hover:text-fg"
              }`}
            >
              {t("analysis.tabs.review")}
              {reviewCount > 0 && (
                <span className="w-3.5 h-3.5 text-[8px] font-bold rounded-full bg-destructive text-on-accent flex items-center justify-center shrink-0 ml-1 shadow-sm">
                  {reviewCount}
                </span>
              )}
            </button>
          </div>

          {/* 뷰 모드 전환 토글 (고정 뷰일 때만 보임) */}
          {viewMode === "fixView" && (
            <button
              data-testid="view-mode-toggle"
              onClick={() => setViewMode("floatingView")}
              className="p-1.5 rounded-full hover:bg-surface-hover text-muted hover:text-fg transition-[colors,transform] duration-150 active:scale-90 shrink-0"
              title={t("analysis.viewMode.switchToFloating")}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 서사 요약 드로어 (상단 슬라이드 인) */}
      <SummaryDrawer
        open={review.showNarrativeSummaryStatus}
        loading={review.narrativeSummaryStatusLoading}
        error={review.narrativeSummaryStatusError}
        status={review.narrativeSummaryStatus}
        onClose={() => review.setShowNarrativeSummaryStatus(false)}
      />

      {/* 본문 콘텐츠 — 탭 분기 */}
      {!floatingCompact && (
        <div data-no-drag className="flex-1 overflow-y-auto px-5 pt-4 min-h-0 cursor-auto custom-scrollbar">
          {sectionTab === "review" ? (
            /* 설정 검토 탭: 7개 리뷰 패널만 표시 */
            <div className="mb-4 space-y-2.5">
              <ConflictQueuePanel
                visible={review.showConflictQueue}
                loading={review.conflictQueueLoading}
                error={review.conflictQueueError}
                items={review.conflictQueueItems}
                reviewFilter={review.conflictQueueReviewFilter}
                onChangeReviewFilter={review.setConflictQueueReviewFilter}
                resolvingConflictId={review.resolvingConflictId}
                onToggle={() => review.setShowConflictQueue((prev) => !prev)}
                renderFact={formatConflictFact}
                onResolve={review.handleResolveConflict}
                onDefer={review.handleDeferConflict}
              />
              <FactReviewPanel
                visible={review.showFactReviewQueue}
                loading={review.factReviewLoading}
                error={review.factReviewError}
                items={review.factReviewItems}
                mutatingFactId={review.mutatingFactId}
                onToggle={() => review.setShowFactReviewQueue((prev) => !prev)}
                onConfirm={review.handleConfirmFact}
                onReject={review.handleRejectFact}
              />
              <EpisodeReviewPanel
                visible={review.showEpisodeReviewQueue}
                loading={review.episodeReviewLoading}
                error={review.episodeReviewError}
                items={review.episodeReviewItems}
                mutatingEpisodeId={review.mutatingEpisodeId}
                onToggle={() => review.setShowEpisodeReviewQueue((prev) => !prev)}
                onConfirm={review.handleConfirmEpisode}
                onReject={review.handleRejectEpisode}
              />
              <EntityReviewPanel
                visible={review.showEntityReviewQueue}
                loading={review.entityReviewLoading}
                error={review.entityReviewError}
                items={review.entityReviewItems}
                mutatingEntityId={review.mutatingEntityId}
                onToggle={() => review.setShowEntityReviewQueue((prev) => !prev)}
                onConfirm={review.handleConfirmEntity}
                onReject={review.handleRejectEntity}
              />
              <EntityAliasReviewPanel
                visible={review.showEntityAliasReviewQueue}
                loading={review.entityAliasReviewLoading}
                error={review.entityAliasReviewError}
                items={review.entityAliasReviewItems}
                mutatingAliasId={review.mutatingAliasId}
                onToggle={() => review.setShowEntityAliasReviewQueue((prev) => !prev)}
                onConfirm={review.handleConfirmEntityAlias}
                onReject={review.handleRejectEntityAlias}
                onMerge={review.handleMergeEntityAlias}
                onSplit={review.handleSplitEntityAlias}
              />
              <StaleEvidenceReviewPanel
                visible={review.showStaleEvidenceReviewQueue}
                loading={review.staleEvidenceReviewLoading}
                error={review.staleEvidenceReviewError}
                items={review.staleEvidenceReviewItems}
                mutatingStaleEvidenceId={review.mutatingStaleEvidenceId}
                repairing={review.repairingStaleEvidenceLinks}
                onToggle={() => review.setShowStaleEvidenceReviewQueue((prev) => !prev)}
                onAction={review.handleReviewStaleEvidence}
                onRepair={review.handleRepairStaleEvidence}
              />
              <MemoryEvalReportPanel
                visible={evalPanel.showMemoryEvalReport}
                loading={evalPanel.memoryEvalLoading}
                error={evalPanel.memoryEvalError}
                report={evalPanel.memoryEvalReport}
                intentCalibrationReport={evalPanel.intentCalibrationReport}
                episodeCalibrationReport={evalPanel.episodeCalibrationReport}
                onToggle={() =>
                  evalPanel.setShowMemoryEvalReport((prev) => !prev)
                }
                onRun={evalPanel.handleRunMemoryEval}
                onRunIntentCalibration={evalPanel.handleRunIntentCalibration}
                onRunEpisodeCalibration={evalPanel.handleRunEpisodeCalibration}
                pendingFeedbackKey={evalPanel.pendingFeedbackKey}
                onRecordAnswerWrong={evalPanel.handleRecordAnswerWrong}
                onRecordEvidenceHelpful={evalPanel.handleRecordEvidenceHelpful}
              />
            </div>
          ) : (
            /* 채팅 대화 탭: GPT/클로드 대화창 형식 */
            <div className="h-full flex flex-col min-h-0">
              {isEmpty ? (
                /* 빈 상태: 가이드와 4가지 빠른 프롬프트 카드 */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none animate-[fadeIn_0.4s_ease-out]">
                  <div className="w-11 h-11 rounded-panel bg-element/20 border border-border/10 flex items-center justify-center shadow-sm mb-4">
                    <Bot className="w-5 h-5 text-muted" />
                  </div>
                  <h3 className="text-[13px] font-semibold text-fg/90 mb-2 tracking-tight">
                    {t("analysis.emptyState.title")}
                  </h3>
                  <p className="text-[11px] text-muted max-w-[250px] leading-relaxed mb-6">
                    원고의 등장인물 관계, 세계관 설정 충돌, 복선 회수 여부 등을 AI와 함께 점검해 보세요.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[340px]">
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.summaryPrompt"))}
                      className="rounded-control border border-border/10 hover:border-accent/20 bg-element/5 hover:bg-element/12 p-3 text-left text-xs transition-[colors,transform] duration-200 hover:scale-[1.01] active:scale-98"
                    >
                      <div className="font-semibold mb-0.5 text-fg/80">{t("analysis.emptyState.summaryLabel")}</div>
                      <div className="text-[10px] text-muted truncate">{t("analysis.emptyState.summaryPrompt")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.relationPrompt"))}
                      className="rounded-control border border-border/10 hover:border-accent/20 bg-element/5 hover:bg-element/12 p-3 text-left text-xs transition-[colors,transform] duration-200 hover:scale-[1.01] active:scale-98"
                    >
                      <div className="font-semibold mb-0.5 text-fg/80">{t("analysis.emptyState.relationLabel")}</div>
                      <div className="text-[10px] text-muted truncate">{t("analysis.emptyState.relationPrompt")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.conflictPrompt"))}
                      className="rounded-control border border-border/10 hover:border-accent/20 bg-element/5 hover:bg-element/12 p-3 text-left text-xs transition-[colors,transform] duration-200 hover:scale-[1.01] active:scale-98"
                    >
                      <div className="font-semibold mb-0.5 text-fg/80">{t("analysis.emptyState.conflictLabel")}</div>
                      <div className="text-[10px] text-muted truncate">{t("analysis.emptyState.conflictPrompt")}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => chat.setInput(t("analysis.emptyState.foreshadowPrompt"))}
                      className="rounded-control border border-border/10 hover:border-accent/20 bg-element/5 hover:bg-element/12 p-3 text-left text-xs transition-[colors,transform] duration-200 hover:scale-[1.01] active:scale-98"
                    >
                      <div className="font-semibold mb-0.5 text-fg/80">{t("analysis.emptyState.foreshadowLabel")}</div>
                      <div className="text-[10px] text-muted truncate">{t("analysis.emptyState.foreshadowPrompt")}</div>
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
