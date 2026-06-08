import { useState } from "react";
import { Send, Square } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { Button } from "@renderer/components/ui/button";
import { ConflictQueuePanel } from "./analysisSection/ConflictQueuePanel";
import { EntityAliasReviewPanel } from "./analysisSection/EntityAliasReviewPanel";
import { EntityReviewPanel } from "./analysisSection/EntityReviewPanel";
import { EpisodeReviewPanel } from "./analysisSection/EpisodeReviewPanel";
import { FactReviewPanel } from "./analysisSection/FactReviewPanel";
import { MessageList } from "./analysisSection/MessageList";
import { MemoryEvalReportPanel } from "./analysisSection/MemoryEvalReportPanel";
import { NarrativeSummaryStatusPanel } from "./analysisSection/NarrativeSummaryStatusPanel";
import { RuntimeStatusPanel } from "./analysisSection/RuntimeStatusPanel";
import { formatConflictFact } from "./analysisSection/formatters";
import type { MemoryScope, RuntimePreference } from "./analysisSection/types";
import { useAnalysisRuntime } from "./analysisSection/useAnalysisRuntime";
import { useMemoryEvalPanel } from "./analysisSection/useMemoryEvalPanel";
import { useMemoryReviewPanels } from "./analysisSection/useMemoryReviewPanels";
import { useRagChat } from "./analysisSection/useRagChat";

export default function AnalysisSection() {
  const { currentItem: currentChapter } = useChapterStore(
    useShallow((state) => ({ currentItem: state.currentItem })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);
  const [memoryScope, setMemoryScope] = useState<MemoryScope>("current-only");

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
  const memoryEval = useMemoryEvalPanel({ projectId: currentProject?.id });

  return (
    <div className="flex flex-col h-full bg-panel text-fg">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
        <ConflictQueuePanel
          visible={review.showConflictQueue}
          loading={review.conflictLoading}
          error={review.conflictError}
          items={review.conflictItems}
          onToggle={() => review.setShowConflictQueue((prev) => !prev)}
          renderFact={formatConflictFact}
          resolvingConflictId={review.resolvingConflictId}
          onResolve={(item, winnerFactId) =>
            void review.handleResolveConflict(item, winnerFactId)
          }
        />
        <EpisodeReviewPanel
          visible={review.showEpisodeReview}
          loading={review.episodeReviewLoading}
          error={review.episodeReviewError}
          items={review.episodeReviewItems}
          rejectingEpisodeId={review.rejectingEpisodeId}
          onToggle={() => review.setShowEpisodeReview((prev) => !prev)}
          onReject={(item) => void review.handleRejectEpisode(item)}
        />
        <FactReviewPanel
          visible={review.showFactReview}
          loading={review.factReviewLoading}
          error={review.factReviewError}
          items={review.factReviewItems}
          mutatingFactId={review.mutatingFactId}
          onToggle={() => review.setShowFactReview((prev) => !prev)}
          onConfirm={(item) => void review.handleConfirmFact(item)}
          onReject={(item) => void review.handleRejectFact(item)}
        />
        <EntityReviewPanel
          visible={review.showEntityReview}
          loading={review.entityReviewLoading}
          error={review.entityReviewError}
          items={review.entityReviewItems}
          mutatingEntityId={review.mutatingEntityId}
          onToggle={() => review.setShowEntityReview((prev) => !prev)}
          onConfirm={(item) => void review.handleConfirmEntity(item)}
          onReject={(item) => void review.handleRejectEntity(item)}
        />
        <EntityAliasReviewPanel
          visible={review.showEntityAliasReview}
          loading={review.entityAliasReviewLoading}
          error={review.entityAliasReviewError}
          items={review.entityAliasReviewItems}
          mutatingAliasId={review.mutatingAliasId}
          onToggle={() => review.setShowEntityAliasReview((prev) => !prev)}
          onConfirm={(item) => void review.handleConfirmEntityAlias(item)}
          onReject={(item) => void review.handleRejectEntityAlias(item)}
          onMerge={(item, targetEntityId) =>
            void review.handleMergeEntityAlias(item, targetEntityId)
          }
          onSplit={(item, canonicalName) =>
            void review.handleSplitEntityAlias(item, canonicalName)
          }
        />
        <NarrativeSummaryStatusPanel
          visible={review.showNarrativeSummaryStatus}
          loading={review.narrativeSummaryStatusLoading}
          error={review.narrativeSummaryStatusError}
          status={review.narrativeSummaryStatus}
          onToggle={() => review.setShowNarrativeSummaryStatus((prev) => !prev)}
        />
        <MemoryEvalReportPanel
          visible={memoryEval.showMemoryEvalReport}
          loading={memoryEval.memoryEvalLoading}
          error={memoryEval.memoryEvalError}
          report={memoryEval.memoryEvalReport}
          intentCalibrationReport={memoryEval.intentCalibrationReport}
          episodeCalibrationReport={memoryEval.episodeCalibrationReport}
          onToggle={() => memoryEval.setShowMemoryEvalReport((prev) => !prev)}
          onRun={() => void memoryEval.handleRunMemoryEval()}
          onRunIntentCalibration={() =>
            void memoryEval.handleRunIntentCalibration()
          }
          onRunEpisodeCalibration={() =>
            void memoryEval.handleRunEpisodeCalibration()
          }
        />

        {chat.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted gap-3">
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

      <div className="shrink-0 border-t border-border p-3 bg-panel">
        <div className="mb-2 flex items-center gap-2 px-1">
          <label
            htmlFor="analysis-runtime-pref"
            className="text-[11px] text-muted"
          >
            Route
          </label>
          <select
            id="analysis-runtime-pref"
            value={runtime.runtimePreference}
            onChange={(event) =>
              void runtime.applyRuntimePreference(
                event.target.value as RuntimePreference,
              )
            }
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
            onChange={(event) =>
              setMemoryScope(event.target.value as MemoryScope)
            }
            className="h-7 rounded border border-border bg-surface px-2 text-xs text-fg"
          >
            <option value="current-only">현재 챕터만</option>
            <option value="with-prior">현재+과거</option>
          </select>
        </div>

        <RuntimeStatusPanel
          runtimeInfo={runtime.runtimeInfo}
          sidecarStatus={runtime.sidecarStatus}
        />

        {currentChapter && (
          <div className="text-xs text-muted mb-2 flex items-center gap-1.5 font-medium px-1">
            <span>Context: {currentChapter.title}</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 text-sm bg-surface border border-border rounded-xl px-3.5 py-2.5 resize-none text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent min-h-[44px] max-h-[160px] transition-shadow"
            placeholder="질문 입력... (Enter 전송, Shift+Enter 줄바꿈)"
            value={chat.input}
            onChange={(event) => chat.setInput(event.target.value)}
            onKeyDown={chat.handleKeyDown}
            rows={1}
            disabled={!currentProject}
          />
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
            className="shrink-0 h-[44px] w-[44px] rounded-xl shadow-sm disabled:opacity-50"
          >
            {chat.isStreaming ? (
              <Square className="w-4 h-4 fill-current" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
