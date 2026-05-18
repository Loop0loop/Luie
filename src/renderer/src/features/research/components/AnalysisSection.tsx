import { useState, useEffect, useRef, useCallback } from "react";
import { useChapterStore } from "@renderer/features/manuscript/stores/chapterStore";
import { useAnalysisStore } from "@renderer/features/research/stores/analysisStore";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useShallow } from "zustand/react/shallow";
import type { AnalysisItem } from "@shared/types/analysis";
import {
  PenTool,
  Sparkles,
  ArrowRight,
  Quote,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@shared/ui/ToastContext";
import { Modal } from "@shared/ui/Modal";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import type { RagQaErrorPayload, RagQaStreamPayload } from "@shared/types";
import { requestChapterNavigation } from "@renderer/features/workspace/services/chapterNavigation";

export default function AnalysisSection() {
  const { t } = useTranslation();
  const {
    items: chapters,
    currentItem: currentChapter,
    setCurrent,
  } = useChapterStore(
    useShallow((state) => ({
      items: state.items,
      currentItem: state.currentItem,
      setCurrent: state.setCurrent,
    })),
  );
  const currentProject = useProjectStore((state) => state.currentItem);
  const {
    items: analysisItems,
    isAnalyzing,
    error,
    startAnalysis,
    clearAnalysis,
    addStreamItem,
    setError,
    stopAnalysis,
  } = useAnalysisStore(
    useShallow((state) => ({
      items: state.items,
      isAnalyzing: state.isAnalyzing,
      error: state.error,
      startAnalysis: state.startAnalysis,
      clearAnalysis: state.clearAnalysis,
      addStreamItem: state.addStreamItem,
      setError: state.setError,
      stopAnalysis: state.stopAnalysis,
    })),
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analyzedChapterId, setAnalyzedChapterId] = useState<string>("");
  const [ragQuestion, setRagQuestion] = useState("");
  const [ragRunId, setRagRunId] = useState<string | null>(null);
  const [ragAnswer, setRagAnswer] = useState("");
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragEvidence, setRagEvidence] = useState<
    Array<{ chunkId: string; chapterId: string | null; offset: number; quote: string }>
  >([]);
  const [ragLoading, setRagLoading] = useState(false);
  const { showToast } = useToast();

  const bottomRef = useRef<HTMLDivElement>(null);
  const isAnalyzingRef = useRef(isAnalyzing);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  // Active chapter for analysis - always use currentChapter from editor
  const activeChapterId =
    currentChapter?.id || (chapters.length > 0 ? chapters[0].id : "");

  // Register streaming listeners
  useEffect(() => {
    const unsubscribeStream = api.analysis.onStream((data: unknown) => {
      addStreamItem(data as { item: AnalysisItem; done: boolean });
    });

    const unsubscribeError = api.analysis.onError((errorData: unknown) => {
      const err = errorData as { message: string };
      const fallbackMessage = t("analysis.toast.error");
      setError(err.message ?? fallbackMessage);
      showToast(err.message ?? fallbackMessage, "error");
    });

    return () => {
      unsubscribeStream();
      unsubscribeError();
    };
  }, [addStreamItem, setError, showToast, t]);

  useEffect(() => {
    if (!ragRunId) return;

    const unsubscribeRagStream = api.rag.onStream((payload: RagQaStreamPayload) => {
      if (payload.delta) {
        setRagAnswer((prev) => prev + payload.delta);
      }
      if (payload.done) {
        setRagLoading(false);
        if (payload.result) {
          setRagAnswer(payload.result.answer ?? "");
          setRagEvidence(payload.result.evidence ?? []);
        }
      }
    }, ragRunId);

    const unsubscribeRagError = api.rag.onError((payload: RagQaErrorPayload) => {
      setRagLoading(false);
      setRagError(payload.message ?? t("analysis.toast.error"));
      showToast(payload.message ?? t("analysis.toast.error"), "error");
    }, ragRunId);

    return () => {
      unsubscribeRagStream();
      unsubscribeRagError();
    };
  }, [ragRunId, showToast, t]);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        if (isAnalyzingRef.current) {
          await stopAnalysis();
        }
        // Don't clear analysis data on every cleanup - only on intentional user action
      };
      void cleanup();
    };
  }, [stopAnalysis]);

  // Show error toast
  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  // Scroll to bottom as items appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [analysisItems]);

  const handleAnalyze = useCallback(async () => {
    if (!activeChapterId || !currentProject || isAnalyzing) {
      return;
    }

    try {
      if (analysisItems.length > 0) {
        await clearAnalysis();
      }
      setAnalyzedChapterId(activeChapterId); // Remember which chapter was analyzed
      await startAnalysis(activeChapterId, currentProject.id);
      showToast(t("analysis.toast.start"), "info");
    } catch (err) {
      // Stream errors are handled via onError listener, but catch unexpected failures
      const message = err instanceof Error ? err.message : String(err);
      api.logger.error("Analysis failed unexpectedly", err);
      showToast(message || t("analysis.toast.error"), "error");
    }
  }, [
    activeChapterId,
    currentProject,
    isAnalyzing,
    analysisItems.length,
    clearAnalysis,
    startAnalysis,
    showToast,
    t,
  ]);

  const handleNavigate = useCallback(
    (contextId: string) => {
      // Navigate to the chapter that was analyzed
      const targetChapterId = analyzedChapterId || activeChapterId;
      const targetChapter = chapters.find((c) => c.id === targetChapterId);

      if (targetChapter) {
        setCurrent(targetChapter);
        showToast(
          t("analysis.toast.navigateChapter", { title: targetChapter.title }),
          "info",
        );
      } else {
        showToast(t("analysis.toast.navigateFallback", { contextId }), "info");
      }
    },
    [analyzedChapterId, activeChapterId, chapters, setCurrent, showToast, t],
  );

  const handleAskRag = useCallback(async () => {
    if (!currentProject?.id) return;
    const question = ragQuestion.trim();
    if (!question) return;

    setRagError(null);
    setRagAnswer("");
    setRagEvidence([]);
    setRagLoading(true);

    const response = await api.rag.ask({
      projectId: currentProject.id,
      question,
      chapterId: activeChapterId || undefined,
    });
    if (!response.success || !response.data?.runId) {
      setRagLoading(false);
      const message = response.error?.message ?? t("analysis.toast.error");
      setRagError(message);
      showToast(message, "error");
      return;
    }

    setRagRunId(response.data.runId);
  }, [activeChapterId, currentProject?.id, ragQuestion, showToast, t]);

  const handleStopRag = useCallback(async () => {
    const runId = ragRunId;
    await api.rag.stop(runId ?? undefined);
    setRagLoading(false);
  }, [ragRunId]);

  const handleJumpEvidence = useCallback(
    async (item: { chunkId: string; chapterId: string | null; quote: string }) => {
      if (!item.chapterId) return;

      const backlink = await api.memory.getChunkBacklink(item.chunkId);
      if (!backlink.success) {
        showToast(t("analysis.toast.error"), "error");
        return;
      }

      const query = item.quote?.trim().slice(0, 48) || undefined;
      requestChapterNavigation({
        chapterId: item.chapterId,
        query,
      });
      showToast(t("analysis.toast.navigateChapter", { title: item.chapterId }), "info");
    },
    [showToast, t],
  );

  return (
    <div className="flex flex-col h-full w-full bg-bg-panel text-text-primary font-serif selection:bg-accent-bg/20">
      {/* 1. Minimal Header */}
      <div className="flex-none px-8 py-6 flex items-center justify-between border-b border-border/40 bg-bg-panel/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 opacity-60">
          <PenTool className="w-4 h-4" />
          <span className="text-sm font-medium tracking-widest uppercase">
            {t("analysis.title")}
          </span>
        </div>

        {/* Chapter Selector (Inline style) */}
        {!isAnalyzing && (
          <div className="flex items-center gap-4 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary hidden sm:inline">
                {t("analysis.selectChapter")}
              </span>
              <select
                className="bg-transparent text-sm font-bold border-b border-border hover:border-text-primary cursor-pointer focus:outline-none transition-colors py-1"
                value={activeChapterId}
                onChange={(e) => {
                  const selected = chapters.find(
                    (c) => c.id === e.target.value,
                  );
                  if (selected) {
                    setCurrent(selected);
                  }
                }}
              >
                {chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {analysisItems.length > 0 && (
                <button
                  onClick={() => void clearAnalysis()}
                  className="text-xs font-semibold tracking-wide px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors"
                >
                  {t("analysis.actions.reset")}
                </button>
              )}
              <button
                onClick={() => void handleAnalyze()}
                disabled={!activeChapterId || !currentProject}
                className="text-xs font-semibold tracking-wide px-3 py-1 rounded-full border border-border text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("analysis.actions.reanalyze")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Content Area (Full Bleed / Editorial Layout) */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-20 py-12 custom-scrollbar">
        <div className="max-w-3xl mx-auto flex flex-col gap-12 min-h-[50vh]">
          {/* Empty / Start State */}
          {analysisItems.length === 0 && !isAnalyzing && (
            <div className="flex flex-col items-center justify-center py-20 opacity-60 hover:opacity-100 transition-opacity">
              <p className="text-xl md:text-2xl text-center leading-relaxed whitespace-pre-wrap text-text-secondary mb-8 font-light">
                {t("analysis.emptyState")}
              </p>
              <button
                onClick={() => void handleAnalyze()}
                disabled={!activeChapterId || !currentProject}
                className="group flex items-center gap-3 px-8 py-4 rounded-full bg-surface hover:bg-surface-hover border border-border shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                <span className="text-lg font-medium">
                  {t("analysis.startButton")}
                </span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </button>

              {/* Privacy Disclaimer */}
              <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 delay-300 duration-700">
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                  {t("analysis.disclaimer")}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-3 text-xs text-text-tertiary underline hover:text-text-primary transition-colors cursor-pointer"
                >
                  {t("analysis.disclaimerLink")}
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isAnalyzing && analysisItems.length === 0 && (
            <div className="flex items-center justify-center py-20 animate-pulse">
              <span className="text-lg text-text-tertiary italic">
                {t("analysis.analyzing")}
              </span>
            </div>
          )}

          {/* Stream Content */}
          {analysisItems.map((item) => {
            if (!item) return null; // Safety check
            return (
              <div
                key={item.id}
                className={`
                        relative group animate-in slide-in-from-bottom-2 fade-in duration-700
                        ${item.type === "intro" ? "text-lg md:text-xl leading-relaxed mb-8 font-medium" : ""}
                        ${item.type === "outro" ? "text-right mt-12 text-text-secondary italic pt-8 border-t border-border/30" : ""}
                        ${item.type === "reaction" || item.type === "suggestion" ? "pl-6 md:pl-8 border-l-2 border-transparent hover:border-accent transition-all cursor-pointer rounded-r-xl hover:bg-surface-hover/50 py-4 -my-4 pr-4" : ""}
                    `}
                onClick={() => item.contextId && handleNavigate(item.contextId)}
              >
                {/* Icons for Feedback Items */}
                {(item.type === "reaction" || item.type === "suggestion") && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-panel border border-border p-1.5 rounded-full shadow-sm z-10">
                    {item.type === "reaction" ? (
                      <MessageSquare className="w-4 h-4 text-accent" />
                    ) : (
                      <Quote className="w-4 h-4 text-orange-500" />
                    )}
                  </div>
                )}

                {/* Meta Label */}
                {(item.type === "reaction" || item.type === "suggestion") && (
                  <div className="text-xs font-bold tracking-widest text-text-tertiary mb-2 uppercase opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    {item.type === "reaction"
                      ? t("analysis.result.reaction")
                      : t("analysis.result.contradiction")}
                    {item.quote && (
                      <span className="w-1 h-1 rounded-full bg-text-tertiary"></span>
                    )}
                  </div>
                )}

                {/* Referenced Quote (The "Highlight" Context) */}
                {item.quote && (
                  <div className="mb-3 pl-4 border-l-2 border-text-tertiary/20 text-text-secondary italic text-sm group-hover:text-text-primary transition-colors">
                    "{item.quote}"
                  </div>
                )}

                {/* Main Content */}
                <p
                  className={`whitespace-pre-wrap ${item.type !== "intro" ? "text-lg leading-loose text-text-primary" : ""}`}
                >
                  {item.content}
                </p>

                {/* Hover Action Hint */}
                {item.contextId && (
                  <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-300 ease-out opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2 text-xs text-accent font-sans font-medium">
                      <span>{t("analysis.actions.moveToContext")}</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div ref={bottomRef} className="h-12" />

          <section className="rounded-2xl border border-border/50 bg-surface/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-wide uppercase opacity-80">
                RAG Q&A
              </h3>
              {ragRunId && (
                <span className="text-[11px] text-text-tertiary">
                  run: {ragRunId}
                </span>
              )}
            </div>
            <textarea
              value={ragQuestion}
              onChange={(e) => setRagQuestion(e.target.value)}
              placeholder="질문을 입력하세요. 예: 유란이 황궁 정보를 아는 게 모순이야?"
              className="w-full min-h-[90px] rounded-lg border border-border bg-bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => void handleAskRag()}
                disabled={ragLoading || !ragQuestion.trim() || !currentProject}
                className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                질문하기
              </button>
              <button
                onClick={() => void handleStopRag()}
                disabled={!ragLoading}
                className="px-3 py-1.5 rounded-md border border-border text-sm hover:border-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                중단
              </button>
            </div>
            {ragLoading && (
              <p className="text-sm text-text-secondary">응답 생성 중...</p>
            )}
            {ragError && <p className="text-sm text-red-500">{ragError}</p>}
            {ragAnswer && (
              <div className="rounded-lg border border-border/50 bg-bg-panel p-3 whitespace-pre-wrap text-sm leading-7">
                {ragAnswer}
              </div>
            )}
            {ragEvidence.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-wide uppercase opacity-70">Evidence</p>
                {ragEvidence.map((item, index) => (
                  <button
                    key={`${item.chunkId}-${index}`}
                    onClick={() => void handleJumpEvidence(item)}
                    className="w-full text-left rounded-md border border-border/50 px-3 py-2 hover:bg-surface-hover transition-colors"
                  >
                    <div className="text-xs text-text-tertiary mb-1">
                      E{index + 1} · chapter: {item.chapterId ?? "N/A"} · offset: {item.offset}
                    </div>
                    <div className="text-sm whitespace-pre-wrap line-clamp-3">{item.quote}</div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("analysis.disclaimerDetailTitle")}
        width="500px"
      >
        <div className="space-y-4 whitespace-pre-wrap text-text-secondary leading-relaxed">
          {t("analysis.disclaimerDetailBody")}
        </div>
      </Modal>
    </div>
  );
}
