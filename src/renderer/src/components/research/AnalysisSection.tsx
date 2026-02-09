import { useState, useEffect } from "react";
import { useChapterStore } from "../../stores/chapterStore";
import { Sparkles, AlertTriangle, MessageCircle, ChevronDown, RefreshCw } from "lucide-react";
import {
  LABEL_ANALYSIS_TITLE,
  LABEL_ANALYSIS_SELECT_CHAPTER,
  LABEL_ANALYSIS_START_BUTTON,
  LABEL_ANALYSIS_ANALYZING,
  LABEL_ANALYSIS_EMPTY_STATE,
  LABEL_ANALYSIS_RESULT_REACTION,
  LABEL_ANALYSIS_RESULT_CONTRADICTION,
} from "../../../../shared/constants";

interface AnalysisResult {
  reactions: { id: string; content: string; sentiment: "positive" | "negative" | "neutral" }[];
  contradictions: { id: string; content: string; severity: "high" | "medium" | "low" }[];
}

const MOCK_RESULT: AnalysisResult = {
  reactions: [
    { id: "1", content: "주인공의 행동이 갑자기 변해서 당황스러워요.", sentiment: "negative" },
    { id: "2", content: "이 부분 전개가 정말 흥미진진하네요!", sentiment: "positive" },
    { id: "3", content: "복선이 회수되는 장면이 인상 깊습니다.", sentiment: "positive" },
  ],
  contradictions: [
    { id: "c1", content: "3챕터에서 언급된 설정과 충돌합니다.", severity: "high" },
    { id: "c2", content: "인물의 어조가 이전과 다소 다릅니다.", severity: "low" },
  ],
};

export default function AnalysisSection() {
  const { items: chapters } = useChapterStore();
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Set initial selected chapter if available and not set
  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  const handleAnalyze = () => {
    if (!selectedChapterId) return;

    setIsAnalyzing(true);
    setResult(null);

    // Simulate API call
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult(MOCK_RESULT);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="text-sm font-semibold flex items-center gap-2 text-fg">
          <Sparkles className="icon-md text-accent" />
          <span>{LABEL_ANALYSIS_TITLE}</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-4 border-b border-border bg-bg-surface flex flex-col gap-3 shrink-0">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted">
            {LABEL_ANALYSIS_SELECT_CHAPTER}
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none bg-element border border-border rounded px-3 py-2 text-sm text-fg focus:outline-none focus:border-accent"
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              disabled={isAnalyzing}
            >
              <option value="" disabled>Select a chapter...</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 icon-xs text-muted pointer-events-none" />
          </div>
        </div>

        <button
          className={`
            flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors
            ${
              !selectedChapterId || isAnalyzing
                ? "bg-element text-muted cursor-not-allowed"
                : "bg-accent text-accent-fg hover:bg-accent-hover"
            }
          `}
          onClick={handleAnalyze}
          disabled={!selectedChapterId || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="icon-sm animate-spin" />
              {LABEL_ANALYSIS_ANALYZING}
            </>
          ) : (
            <>
              <Sparkles className="icon-sm" />
              {LABEL_ANALYSIS_START_BUTTON}
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {!result && !isAnalyzing ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted gap-3 opacity-60">
            <Sparkles className="icon-xl text-border-active" />
            <p className="text-sm whitespace-pre-wrap">{LABEL_ANALYSIS_EMPTY_STATE}</p>
          </div>
        ) : isAnalyzing ? (
          <div className="h-full flex flex-col items-center justify-center gap-4">
             <div className="w-8 h-8 rounded-full border-2 border-border border-t-accent animate-spin" />
             <p className="text-sm text-muted animate-pulse">{LABEL_ANALYSIS_ANALYZING}</p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Reader Reactions */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <MessageCircle className="icon-xs" />
                {LABEL_ANALYSIS_RESULT_REACTION}
              </h3>
              <div className="flex flex-col gap-2">
                {result.reactions.map((item) => (
                  <div key={item.id} className="p-3 rounded bg-element border border-border text-sm text-fg shadow-sm">
                    <p>{item.content}</p>
                    <div className="mt-2 text-xs opacity-70 flex gap-2">
                      <span className={
                        item.sentiment === 'positive' ? 'text-success' : 
                        item.sentiment === 'negative' ? 'text-danger' : 'text-muted'
                      }>
                        {item.sentiment.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contradictions */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="icon-xs" />
                {LABEL_ANALYSIS_RESULT_CONTRADICTION}
              </h3>
              <div className="flex flex-col gap-2">
                {result.contradictions.map((item) => (
                   <div key={item.id} className="p-3 rounded bg-element border border-border border-l-4 border-l-danger text-sm text-fg shadow-sm">
                    <p>{item.content}</p>
                    <div className="mt-1 text-xs text-danger font-medium opacity-80">
                      Severity: {item.severity.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
