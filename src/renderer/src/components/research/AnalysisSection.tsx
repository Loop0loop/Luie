import { useState, useEffect, useRef } from "react";
import { useChapterStore } from "../../stores/chapterStore";
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

// MOCK DATA: Deep, editorial content
interface AnalysisItem {
  id: string;
  type: "reaction" | "suggestion" | "intro" | "outro";
  content: string;
  contextId?: string; // For linking to text
  quote?: string; // The specific text being referenced
}

const MOCK_STREAM: AnalysisItem[] = [
  {
    id: "intro",
    type: "intro",
    content: "작가님, 이번 챕터는 정말 흥미로웠습니다.\n특히 인물의 내면 묘사가 이전보다 훨씬 깊어졌다는 인상을 받았습니다.\n독자의 입장에서 몇 가지 눈에 띄는 지점들을 짚어보았습니다."
  },
  {
    id: "1",
    type: "reaction",
    content: "이 구간의 긴장감이 상당합니다. 주인공이 진실을 마주하는 순간의 호흡이 짧게 끊어지면서, 읽는 사람도 같이 숨을 참게 만드네요.",
    quote: "그는 천천히 고개를 들었고, 거울 속의 자신과 눈이 마주쳤다.",
    contextId: "ctx-1"
  },
  {
    id: "2",
    type: "suggestion",
    content: "3챕터에서 언급된 '절대 방패' 설정과 이 장면의 충돌이 조금 신경 쓰입니다. 독자들이 '어? 아까는 안 부서진다며?'라고 생각할 수도 있을 것 같아요.",
    quote: "창끝이 닿자마자 방패에는 금이 가기 시작했다.",
    contextId: "ctx-2"
  },
  {
    id: "outro",
    type: "outro",
    content: "전반적으로 훌륭한 전개였습니다.\n다음 이야기가 어떻게 풀릴지 기대하며 기다리겠습니다.\n\n- 루이 드림"
  }
];

export default function AnalysisSection() {
  const { items: chapters } = useChapterStore();
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [displayedItems, setDisplayedItems] = useState<AnalysisItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-select first chapter if available
  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Scroll to bottom as items appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedItems]);

  const handleAnalyze = () => {
    if (!selectedChapterId || isAnalyzing) return;

    setIsAnalyzing(true);
    setDisplayedItems([]); 

    // Simulation simulation
    setTimeout(() => {
      startStream(MOCK_STREAM);
    }, 1500);
  };

  const startStream = (items: AnalysisItem[]) => {
    let index = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (index >= items.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsAnalyzing(false);
        return;
      }
      setDisplayedItems(prev => [...prev, items[index]]);
      index++;
    }, 1000); // Rhythmic reading pace
  };

  const handleNavigate = (contextId: string) => {
    showToast(`원고의 해당 위치로 이동합니다. (Mock: ${contextId})`, 'info');
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
        {!isAnalyzing && displayedItems.length === 0 && (
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
            {displayedItems.length === 0 && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-20 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="text-xl md:text-2xl text-center leading-relaxed whitespace-pre-wrap text-text-secondary mb-8 font-light">
                        {LABEL_ANALYSIS_EMPTY_STATE}
                    </p>
                    <button
                        onClick={handleAnalyze}
                        disabled={!selectedChapterId}
                        className="group flex items-center gap-3 px-8 py-4 rounded-full bg-surface hover:bg-surface-hover border border-border shadow-sm hover:shadow-md transition-all duration-300"
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
            {isAnalyzing && displayedItems.length === 0 && (
                <div className="flex items-center justify-center py-20 animate-pulse">
                    <span className="text-lg text-text-tertiary italic">{LABEL_ANALYSIS_ANALYZING}</span>
                </div>
            )}

            {/* Stream Content */}
            {displayedItems.map((item) => {
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
