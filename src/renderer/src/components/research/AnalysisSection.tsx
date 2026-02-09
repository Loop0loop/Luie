import { useState, useEffect, useRef } from "react";
import { useChapterStore } from "../../stores/chapterStore";
import { PenTool, Feather, ArrowRight, Stamp } from "lucide-react";
import {
  LABEL_ANALYSIS_TITLE,
  LABEL_ANALYSIS_SELECT_CHAPTER,
  LABEL_ANALYSIS_START_BUTTON,
  LABEL_ANALYSIS_ANALYZING,
  LABEL_ANALYSIS_EMPTY_STATE,
  LABEL_ANALYSIS_RESULT_EMPTY,
  LABEL_ANALYSIS_RESULT_REACTION, // 독자 노트
  LABEL_ANALYSIS_RESULT_CONTRADICTION // 검토 메모
} from "../../../../shared/constants";
import { useToast } from "../../components/common/ToastContext";

// MOCK DATA: Conversational, "Letter" style
interface AnalysisItem {
  id: string;
  type: "reaction" | "suggestion" | "intro" | "outro";
  content: string;
  contextId?: string;
}

const MOCK_STREAM: AnalysisItem[] = [
  {
    id: "intro",
    type: "intro",
    content: "작가님, 보내주신 원고 잘 읽어보았습니다.\n전체적으로 몰입감이 훌륭해서 시간 가는 줄 모르고 읽었네요.\n몇 가지 인상 깊었던 부분과 사소한 메모들을 남겨둡니다."
  },
  {
    id: "1",
    type: "reaction",
    content: "특히 이 장면에서 주인공의 감정선이 정말 좋았습니다. 독자들도 여기서 숨을 죽이고 지켜볼 것 같아요. 다만, 호흡이 조금 길어지는 느낌이라 문장을 살짝 다듬으면 더 긴박해질 것 같습니다.",
    contextId: "ctx-1"
  },
  {
    id: "2",
    type: "suggestion",
    content: "참, 3챕터에서 나온 '절대 방패' 설정 기억하시죠? 이 장면이랑 살짝 부딪히는 부분이 있는 것 같아서 확인이 필요해 보입니다. 의도하신 복선이라면 그대로 두셔도 좋아요.",
    contextId: "ctx-2"
  },
  {
    id: "outro",
    type: "outro",
    content: "이번 챕터도 정말 고생 많으셨습니다.\n다음 이야기가 벌써 기대되네요.\n\n- 당신의 첫 번째 독자, 루이 드림"
  }
];

export default function AnalysisSection() {
  const { items: chapters } = useChapterStore();
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [displayedItems, setDisplayedItems] = useState<AnalysisItem[]>([]);
  const { showToast } = useToast();
  
  const processingRef = useRef(false);
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  // Scroll to bottom effect for letter writing
  useEffect(() => {
    if (paperRef.current) {
        paperRef.current.scrollTop = paperRef.current.scrollHeight;
    }
  }, [displayedItems]);

  const handleAnalyze = () => {
    if (!selectedChapterId || isAnalyzing) return;

    setIsAnalyzing(true);
    setDisplayedItems([]); 
    processingRef.current = true;

    // Simulate Editor Reading Time
    setTimeout(() => {
      startStream(MOCK_STREAM);
    }, 2000);
  };

  const startStream = (items: AnalysisItem[]) => {
    let index = 0;
    
    // Intro appears first
    const interval = setInterval(() => {
      if (index >= items.length) {
        clearInterval(interval);
        setIsAnalyzing(false);
        processingRef.current = false;
        return;
      }
      
      const nextItem = items[index];
      setDisplayedItems(prev => [...prev, nextItem]);
      index++;
    }, 1200); // Slower, more natural reading pace
  };

  const handleNavigateToContext = (contextId: string) => {
    showToast(`원고의 해당 위치를 펼쳐봅니다. (Mock: ${contextId})`, 'info');
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#2a2420] overflow-hidden relative font-serif">
      {/* Desk Texture / Background Overlay */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] mix-blend-overlay"></div>

      {/* Header (Desk accessories feeling) */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="text-white/80 text-sm font-medium tracking-widest uppercase flex items-center gap-2">
            <Feather className="w-4 h-4 opacity-70" />
            <span>{LABEL_ANALYSIS_TITLE}</span>
        </div>
      </div>

      {/* Main Workspace (The Paper) */}
      <div className="flex-1 flex justify-center overflow-hidden p-6 relative z-10">
        <div 
            ref={paperRef}
            className="w-full max-w-2xl bg-[#fdfbf7] shadow-2xl rounded-sm relative flex flex-col overflow-y-auto overflow-x-hidden transition-all duration-500"
            style={{
                boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.5)',
                // Subtle paper grain
                backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)`,
                backgroundSize: '24px 24px'
            }}
        >
            {/* Paper Header / Chapter Selection */}
            <div className="pt-12 px-12 pb-8 border-b border-stone-200/50 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center">
                        {LABEL_ANALYSIS_SELECT_CHAPTER}
                    </label>
                    <div className="relative self-center min-w-[200px]">
                         <select
                            className="w-full appearance-none bg-transparent border-b-2 border-stone-200 text-center py-2 text-stone-800 font-serif text-lg focus:outline-none focus:border-stone-400 transition-colors cursor-pointer hover:border-stone-300"
                            value={selectedChapterId}
                            onChange={(e) => setSelectedChapterId(e.target.value)}
                            disabled={isAnalyzing}
                            >
                            <option value="" disabled>Select Chapter</option>
                            {chapters.map((chapter) => (
                                <option key={chapter.id} value={chapter.id}>
                                {chapter.title}
                                </option>
                            ))}
                        </select>
                         {/* Hand-drawn style underline/arrow could go here */}
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        className={`
                            group relative px-6 py-2 text-sm font-medium tracking-wide transition-all duration-300
                            ${!selectedChapterId || isAnalyzing
                                ? "text-stone-300 cursor-not-allowed"
                                : "text-stone-600 hover:text-stone-900"
                            }
                        `}
                        onClick={handleAnalyze}
                        disabled={!selectedChapterId || isAnalyzing}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                             {isAnalyzing ? (
                                <>
                                    <PenTool className="w-4 h-4 animate-bounce" />
                                    {LABEL_ANALYSIS_ANALYZING}
                                </>
                             ) : (
                                <>
                                    <Stamp className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity -rotate-12" />
                                    {LABEL_ANALYSIS_START_BUTTON}
                                </>
                             )}
                        </span>
                        {/* Button Underline Animation */}
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-stone-800 transition-all duration-300 group-hover:w-full opacity-50"></span>
                    </button>
                </div>
            </div>

            {/* Content Body (The Letter) */}
            <div className="flex-1 px-12 py-10 flex flex-col gap-8 min-h-[400px]">
                {displayedItems.length === 0 && !isAnalyzing ? (
                    <div className="flex-1 flex flex-col items-center justify-center opacity-40 select-none pointer-events-none">
                         <div className="w-16 h-16 border-2 border-stone-300 rounded-full flex items-center justify-center mb-4">
                            <Feather className="w-8 h-8 text-stone-300" />
                         </div>
                         <p className="text-stone-400 text-center whitespace-pre-wrap leading-relaxed font-serif">
                             {LABEL_ANALYSIS_EMPTY_STATE}
                         </p>
                    </div>
                ) : (
                    <>
                         {displayedItems.map((item) => (
                             <div 
                                key={item.id}
                                className={`
                                    relative animate-in fade-in slide-in-from-bottom-4 duration-700
                                    ${item.type === 'intro' || item.type === 'outro' ? 'text-stone-800' : 'pl-6 border-l-2'}
                                    ${item.type === 'reaction' ? 'border-sky-800/20' : ''}
                                    ${item.type === 'suggestion' ? 'border-amber-700/20' : ''}
                                    ${item.type === 'intro' ? 'pb-4 border-b border-stone-100 mb-2' : ''}
                                    ${item.type === 'outro' ? 'pt-8 mt-4 border-t border-stone-100 text-right italic' : ''}
                                `}
                             >
                                 {/* Marginalia Label */}
                                 {item.type === 'reaction' && (
                                     <span className="absolute -left-2 top-0 -translate-x-full pr-4 text-[10px] font-bold text-sky-800/40 uppercase tracking-widest hidden sm:block">
                                         {LABEL_ANALYSIS_RESULT_REACTION}
                                     </span>
                                 )}
                                 {item.type === 'suggestion' && (
                                     <span className="absolute -left-2 top-0 -translate-x-full pr-4 text-[10px] font-bold text-amber-800/40 uppercase tracking-widest hidden sm:block">
                                         {LABEL_ANALYSIS_RESULT_CONTRADICTION}
                                     </span>
                                 )}

                                 {/* Content Text */}
                                 <p className={`whitespace-pre-wrap leading-loose text-stone-700 ${item.type === 'outro' ? 'text-stone-500' : ''}`}>
                                    {item.content}
                                 </p>

                                 {/* Interactive Annotation */}
                                 {item.contextId && (
                                     <div className="mt-3">
                                        <button 
                                            onClick={() => handleNavigateToContext(item.contextId!)}
                                            className="text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center gap-1 group"
                                        >
                                            <span className="group-hover:underline decoration-stone-300 underline-offset-4">참고 부분 확인하기</span>
                                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                                        </button>
                                     </div>
                                 )}
                             </div>
                         ))}
                    </>
                )}
            </div>
            
            {/* Footer Paper Texture Overlay for depth */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f6f1e6] to-transparent pointer-events-none opacity-50"></div>
        </div>
      </div>
    </div>
  );
}
