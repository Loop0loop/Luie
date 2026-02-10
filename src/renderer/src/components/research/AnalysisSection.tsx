import { useState, useEffect, useRef } from "react";
import { useChapterStore } from "../../stores/chapterStore";
import { useAnalysisStore } from "../../stores/analysisStore";
import { useProjectStore } from "../../stores/projectStore";
import type { AnalysisItem } from "../../../../shared/types/analysis";
import { PenTool, Sparkles, ArrowRight, Quote, MessageSquare } from "lucide-react";
import {
  LABEL_ANALYSIS_TITLE,
  LABEL_ANALYSIS_SELECT_CHAPTER,
  LABEL_ANALYSIS_START_BUTTON,
  LABEL_ANALYSIS_ANALYZING,
  LABEL_ANALYSIS_EMPTY_STATE,
  LABEL_ANALYSIS_RESULT_REACTION,
  LABEL_ANALYSIS_RESULT_CONTRADICTION,
  LABEL_ANALYSIS_DISCLAIMER,
  LABEL_ANALYSIS_DISCLAIMER_LINK,
  LABEL_ANALYSIS_DISCLAIMER_DETAIL_TITLE,
  LABEL_ANALYSIS_DISCLAIMER_DETAIL_BODY
} from "../../../../shared/constants";
import { useToast } from "../../components/common/ToastContext";
import { Modal } from "../../components/common/Modal";

export default function AnalysisSection() {
  const { items: chapters } = useChapterStore();
  const { currentProject } = useProjectStore();
  const { 
    items: analysisItems, 
    isAnalyzing, 
    error,
    startAnalysis, 
    stopAnalysis,
    clearAnalysis,
    addStreamItem,
    setError
  } = useAnalysisStore();
  
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Set initial chapter when chapters load (without useEffect)
  const effectiveChapterId = selectedChapterId || (chapters.length > 0 ? chapters[0].id : "");

  // Debug: log component state
  useEffect(() => {
    console.log("[RENDERER] AnalysisSection state", {
      chapters: chapters.length,
      currentProject: currentProject?.id,
      effectiveChapterId,
      selectedChapterId,
      isAnalyzing,
      analysisItemsCount: analysisItems.length,
    });
  }, [chapters, currentProject, effectiveChapterId, selectedChapterId, isAnalyzing, analysisItems]);

  // Register streaming listeners
  useEffect(() => {
    console.log("[RENDERER] Registering analysis stream listeners");
    const unsubscribeStream = window.api.analysis.onStream((data: unknown) => {
      console.log("[RENDERER] Received stream data:", data);
      addStreamItem(data as { item: AnalysisItem; done: boolean });
    });

    const unsubscribeError = window.api.analysis.onError((errorData: unknown) => {
      console.log("[RENDERER] Received error:", errorData);
      const err = errorData as { message: string };
      setError(err.message ?? "분석 중 오류가 발생했습니다.");
      showToast(err.message ?? "분석 중 오류가 발생했습니다.", "error");
    });

    return () => {
      console.log("[RENDERER] Unregistering analysis listeners");
      unsubscribeStream();
      unsubscribeError();
    };
  }, [addStreamItem, setError, showToast]);

  // Cleanup on unmount or tab switch
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        const currentlyAnalyzing = useAnalysisStore.getState().isAnalyzing;
        if (currentlyAnalyzing) {
          await stopAnalysis();
        }
        await clearAnalysis();
      };
      void cleanup();
    };
  }, []); // Empty deps - only run on mount/unmount

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

  const handleAnalyze = async () => {
    console.log("[RENDERER] handleAnalyze called", {
      effectiveChapterId,
      currentProject: currentProject?.id,
      isAnalyzing,
      chapters: chapters.length,
    });

    if (!effectiveChapterId || !currentProject || isAnalyzing) {
      console.log("[RENDERER] Analysis blocked", {
        hasChapterId: !!effectiveChapterId,
        hasProject: !!currentProject,
        isAnalyzing,
      });
      return;
    }

    try {
      console.log("[RENDERER] Starting analysis", { chapterId: effectiveChapterId, projectId: currentProject.id });
      await startAnalysis(effectiveChapterId, currentProject.id);
      showToast("분석을 시작합니다...", "info");
    } catch (error) {
      console.error("[RENDERER] Analysis start failed", error);
      // Error is already set in the store and logged in main process
      // No need to log again here
    }
  };

  const handleNavigate = (contextId: string) => {
    showToast(`원고의 해당 위치로 이동합니다. (context: ${contextId})`, 'info');
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-panel text-text-primary font-serif selection:bg-accent-bg/20">
      
      {/* 1. Minimal Header */}
      <div className="flex-none px-8 py-6 flex items-center justify-between border-b border-border/40 bg-bg-panel/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 opacity-60">
            <PenTool className="w-4 h-4" />
            <span className="text-sm font-medium tracking-widest uppercase">{LABEL_ANALYSIS_TITLE}</span>
        </div>
        
        {/* Chapter Selector (Inline style) */}
        {!isAnalyzing && analysisItems.length === 0 && (
            <div className="flex items-center gap-3 animate-in fade-in duration-500">
                <span className="text-sm text-text-secondary hidden sm:inline">{LABEL_ANALYSIS_SELECT_CHAPTER}</span>
                <select 
                    className="bg-transparent text-sm font-bold border-b border-border hover:border-text-primary cursor-pointer focus:outline-none transition-colors py-1"
                    value={selectedChapterId}
                    onChange={(e) => setSelectedChapterId(e.target.value)}
                >
                    {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
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
                        {LABEL_ANALYSIS_EMPTY_STATE}
                    </p>
                    <button
                        onClick={() => {
                          console.log("[RENDERER] Button clicked", { effectiveChapterId, currentProjectId: currentProject?.id });
                          void handleAnalyze();
                        }}
                        disabled={!effectiveChapterId || !currentProject}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full bg-surface hover:bg-surface-hover border border-border shadow-sm hover:shadow-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                        <span className="text-lg font-medium">{LABEL_ANALYSIS_START_BUTTON}</span>
                        <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </button>

                    {/* Privacy Disclaimer */}
                    <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-2 delay-300 duration-700">
                        <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                            {LABEL_ANALYSIS_DISCLAIMER}
                        </p>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="mt-3 text-xs text-text-tertiary underline hover:text-text-primary transition-colors cursor-pointer"
                        >
                            {LABEL_ANALYSIS_DISCLAIMER_LINK}
                        </button>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isAnalyzing && analysisItems.length === 0 && (
                <div className="flex items-center justify-center py-20 animate-pulse">
                    <span className="text-lg text-text-tertiary italic">{LABEL_ANALYSIS_ANALYZING}</span>
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
                        ${item.type === 'intro' ? 'text-lg md:text-xl leading-relaxed mb-8 font-medium' : ''}
                        ${item.type === 'outro' ? 'text-right mt-12 text-text-secondary italic pt-8 border-t border-border/30' : ''}
                        ${(item.type === 'reaction' || item.type === 'suggestion') ? 'pl-6 md:pl-8 border-l-2 border-transparent hover:border-accent transition-all cursor-pointer rounded-r-xl hover:bg-surface-hover/50 py-4 -my-4 pr-4' : ''}
                    `}
                    onClick={() => item.contextId && handleNavigate(item.contextId)}
                >
                    {/* Icons for Feedback Items */}
                    {(item.type === 'reaction' || item.type === 'suggestion') && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-panel border border-border p-1.5 rounded-full shadow-sm z-10">
                            {item.type === 'reaction' ? (
                                <MessageSquare className="w-4 h-4 text-accent" />
                            ) : (
                                <Quote className="w-4 h-4 text-orange-500" />
                            )}
                        </div>
                    )}

                    {/* Meta Label */}
                    {(item.type === 'reaction' || item.type === 'suggestion') && (
                        <div className="text-xs font-bold tracking-widest text-text-tertiary mb-2 uppercase opacity-50 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                             {item.type === 'reaction' ? LABEL_ANALYSIS_RESULT_REACTION : LABEL_ANALYSIS_RESULT_CONTRADICTION}
                             {item.quote && <span className="w-1 h-1 rounded-full bg-text-tertiary"></span>}
                        </div>
                    )}

                    {/* Referenced Quote (The "Highlight" Context) */}
                    {item.quote && (
                        <div className="mb-3 pl-4 border-l-2 border-text-tertiary/20 text-text-secondary italic text-sm group-hover:text-text-primary transition-colors">
                            "{item.quote}"
                        </div>
                    )}

                    {/* Main Content */}
                    <p className={`whitespace-pre-wrap ${item.type !== 'intro' ? 'text-lg leading-loose text-text-primary' : ''}`}>
                        {item.content}
                    </p>

                    {/* Hover Action Hint */}
                    {item.contextId && (
                        <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-3 transition-all duration-300 ease-out opacity-0 group-hover:opacity-100">
                             <div className="flex items-center gap-2 text-xs text-accent font-sans font-medium">
                                 <span>문맥으로 이동하기</span>
                                 <ArrowRight className="w-3 h-3" />
                             </div>
                        </div>
                    )}
                </div>
            )})}
            
      <div ref={bottomRef} className="h-12" />
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={LABEL_ANALYSIS_DISCLAIMER_DETAIL_TITLE}
        width="500px"
      >
        <div className="space-y-4 whitespace-pre-wrap text-text-secondary leading-relaxed">
            {LABEL_ANALYSIS_DISCLAIMER_DETAIL_BODY}
        </div>
      </Modal>
    </div>
  );
}
