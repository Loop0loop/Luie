import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
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
import { SummaryDrawer } from "./analysisSection/review/summary/SummaryDrawer";
import type { MemoryScope } from "./analysisSection/shared/types";
import type { AnalysisConflictItem } from "./analysisSection/shared/types";
import { useAnalysisRuntime } from "./analysisSection/runtime/useAnalysisRuntime";
import { useMemoryReviewPanels } from "./analysisSection/review/queue/useMemoryReviewPanels";
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
      className={`group fixed bottom-24 right-6 rounded-3xl border border-white/10 ring-1 ring-white/5 shadow-[0_24px_70px_-15px_rgba(0,0,0,0.7)] bg-neutral-900/55 backdrop-blur-2xl backdrop-saturate-150 z-[9999] flex flex-col overflow-hidden cursor-grab active:cursor-grabbing ${
        isDraggingState ? "transition-none" : "transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
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
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current-only");

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
    chapterId: currentChapter?.id,
    memoryScope,
  });
  const review = useMemoryReviewPanels({
    projectId: currentProject?.id,
    chapterId: currentChapter?.id,
    memoryScope,
  });

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
      } ${floating ? "bg-black/20" : "bg-[#161616]"}`}
    >
      {/* fixView 모드일 때만 고정 헤더와 토글 버튼 렌더링 */}
      {viewMode === "fixView" && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/20 select-none">
          <span className="text-xs font-semibold text-fg/70 tracking-wide">
            {t("analysis.title")}
          </span>
          <button
            data-testid="view-mode-toggle"
            onClick={() => setViewMode("floatingView")}
            className="p-1.5 rounded-lg hover:bg-neutral-850 text-neutral-400 hover:text-fg transition-all duration-150 active:scale-95"
            title={t("analysis.viewMode.switchToFloating")}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
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

      {/* 메시지 — 빈 상태에서는 영역 자체를 접어 프롬프트만 노출 */}
      {!floatingCompact && (
        <div data-no-drag className="flex-1 overflow-y-auto px-4 pt-4 min-h-0 cursor-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          <div className="mb-4 space-y-2">
            <ConflictQueuePanel
              visible={review.showConflictQueue}
              loading={review.conflictQueueLoading}
              error={review.conflictQueueError}
              items={review.conflictQueueItems}
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
          </div>
          {!isEmpty && (
            <div className="space-y-6">
              <MessageList
                messages={chat.messages}
                onJumpEvidence={chat.handleJumpEvidence}
              />
              <div ref={chat.bottomRef} />
            </div>
          )}
        </div>
      )}

      {/* 입력창 — 하단 고정 (flow) */}
      <div className="px-3 pb-3 pt-2 shrink-0">{composer}</div>
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
