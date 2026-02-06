import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  FileText, 
  Type, 
  Layout, 
  Download 
} from "lucide-react";
import { cn } from "../../../../shared/types/utils";

/**
 * Export Window - Independent Window for document export
 * PRD: "Left Control, Right View" architecture
 */

const SectionHeader = ({ id, title, icon: Icon, expanded, onToggle }: { id: string; title: string; icon: React.ElementType; expanded: boolean; onToggle: (id: string) => void }) => (
  <button 
    className="flex items-center justify-between w-full p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5"
    onClick={() => onToggle(id)}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-zinc-400" />
      <span className="font-medium text-sm text-zinc-200">{title}</span>
    </div>
    {expanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
  </button>
);

export default function ExportWindow() {
  const [chapterId] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("chapterId");
  });

  useEffect(() => {
    // Set dark theme for window wrapper to ensure modal looks good
    document.documentElement.setAttribute("data-theme", "dark");
  }, [chapterId]);
  
  // Settings State
  const [format, setFormat] = useState<"word" | "hwp">("word");
  const [paperSize, setPaperSize] = useState("A4");
  const [marginTop, setMarginTop] = useState(20);
  const [marginBottom, setMarginBottom] = useState(15);
  const [marginLeft, setMarginLeft] = useState(20); // also used for right
  const [lineHeight, setLineHeight] = useState("160%");
  const [fontFamily, setFontFamily] = useState("Batang");

  // Expanded Sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    format: true,
    page: true,
    typography: true,
    header: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="flex w-screen h-screen bg-[#333] text-white overflow-hidden select-none">
      {/* ─── LEFT PANEL: CONTROL (320px) ───────────────────────────── */}
      <div className="w-[320px] flex flex-col bg-[#1e1e1e] border-r border-[#333] shrink-0 z-10 shadow-xl">
        {/* Header */}
        <div className="h-12 flex items-center px-4 border-b border-white/10 shrink-0">
          <Settings className="w-4 h-4 mr-2 text-zinc-400" />
          <span className="font-semibold text-sm">내보내기 설정</span>
        </div>

        {/* Settings List (Accordion) */}
        <div className="flex-1 overflow-y-auto">
          {/* A. Format Selector */}
          <SectionHeader id="format" title="포맷 선택" icon={FileText} expanded={expandedSections["format"]} onToggle={toggleSection} />
          {expandedSections["format"] && (
            <div className="p-4 bg-black/20 border-b border-white/5 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="flex items-center p-3 rounded-lg border border-blue-500/50 bg-blue-500/10 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    checked={format === "word"}
                    onChange={() => setFormat("word")} 
                    className="mr-3 text-blue-500 focus:ring-blue-500" 
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">MS Word (.docx)</span>
                    <span className="text-xs text-zinc-400">가장 호환성이 좋습니다.</span>
                  </div>
                </label>
                <label className="flex items-center p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    checked={format === "hwp"}
                    onChange={() => setFormat("hwp")} 
                    className="mr-3 text-zinc-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">한글 문서 (.hwpx)</span>
                    <span className="text-xs text-orange-400/80">Beta 기능입니다.</span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* B. Page Setup */}
          <SectionHeader id="page" title="용지 및 여백" icon={Layout} expanded={expandedSections["page"]} onToggle={toggleSection} />
          {expandedSections["page"] && (
            <div className="p-4 bg-black/20 border-b border-white/5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">용지 크기</label>
                <select 
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full bg-[#333] border border-white/10 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="A4">A4 (국배판) - 210 x 297mm</option>
                  <option value="B6">B6 (4x6판) - 128 x 188mm</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-zinc-400 block mb-1">여백 (mm)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500">위쪽 (Top)</label>
                    <input 
                      type="number" 
                      value={marginTop} 
                      onChange={(e) => setMarginTop(Number(e.target.value))}
                      className="w-full bg-[#333] border border-white/10 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500">아래쪽 (Bottom)</label>
                    <input 
                      type="number" 
                      value={marginBottom} 
                      onChange={(e) => setMarginBottom(Number(e.target.value))}
                      className="w-full bg-[#333] border border-white/10 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500">왼쪽 (Left)</label>
                    <input 
                      type="number" 
                      value={marginLeft} 
                      onChange={(e) => setMarginLeft(Number(e.target.value))}
                      className="w-full bg-[#333] border border-white/10 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500">오른쪽 (Right)</label>
                    <input 
                      type="number" 
                      value={marginLeft} 
                      onChange={(e) => setMarginLeft(Number(e.target.value))}
                      className="w-full bg-[#333] border border-white/10 rounded px-2 py-1 text-sm text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* C. Typography */}
          <SectionHeader id="typography" title="글자 및 문단" icon={Type} expanded={expandedSections["typography"]} onToggle={toggleSection} />
          {expandedSections["typography"] && (
            <div className="p-4 bg-black/20 border-b border-white/5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">글꼴 (Font)</label>
                <select 
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full bg-[#333] border border-white/10 rounded px-2 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Batang">바탕체 (Batang)</option>
                  <option value="Myeongjo">명조체 (Myeongjo)</option>
                  <option value="Gulim">굴림체 (Gulim)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400">줄 간격 (Line Height)</label>
                <div className="flex bg-[#333] rounded p-0.5 border border-white/10">
                  <button 
                    onClick={() => setLineHeight("160%")}
                    className={cn(
                      "flex-1 py-1 text-xs rounded transition-all",
                      lineHeight === "160%" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    160% (한글)
                  </button>
                  <button 
                    onClick={() => setLineHeight("1.5")}
                    className={cn(
                      "flex-1 py-1 text-xs rounded transition-all",
                      lineHeight === "1.5" ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    1.5배 (워드)
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="checkbox" defaultChecked className="rounded bg-[#333] border-white/20" />
                <span className="text-xs text-zinc-300">문단 첫 줄 들여쓰기 (10pt)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-white/10 bg-[#1e1e1e]">
          <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white h-10 rounded-md font-medium transition-colors shadow-lg active:transform active:scale-[0.98]">
            <Download className="w-4 h-4" />
            내보내기 (.docx)
          </button>
        </div>
      </div>

      {/* ─── RIGHT PANEL: PREVIEW (Auto) ──────────────────────────── */}
      <div className="flex-1 bg-[#2e2e2e] relative overflow-hidden flex flex-col items-center">
        {/* Toolbar */}
        <div className="w-full h-12 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="text-sm text-zinc-400 font-medium tracking-wide">
            PREVIEW MODE
          </div>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5">
             <button className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:bg-white/10 rounded transition-colors">-</button>
             <span className="text-xs w-12 text-center text-white font-mono">100%</span>
             <button className="w-8 h-8 flex items-center justify-center text-zinc-300 hover:bg-white/10 rounded transition-colors">+</button>
          </div>
        </div>

        {/* Paper Canvas */}
        <div className="flex-1 w-full overflow-auto p-8 flex justify-center items-start">
          <div 
            className="bg-white text-black shadow-2xl transition-all duration-300 ease-out origin-top"
            style={{
              width: "210mm",
              minHeight: "297mm",
              paddingTop: `${marginTop}mm`,
              paddingBottom: `${marginBottom}mm`,
              paddingLeft: `${marginLeft}mm`,
              paddingRight: `${marginLeft}mm`,
              // fontFamily: fontFamily === 'Batang' ? '"Noto Serif KR", serif' : 'sans-serif', // Simulation
            }}
          >
             {/* Content Simulation */}
             <div className="w-full h-full flex flex-col">
                <div className="space-y-4" style={{
                  lineHeight: lineHeight === '160%' ? 1.6 : 1.5,
                  fontSize: '10pt',
                  fontFamily: '"Noto Serif KR", serif' 
                }}>
                  <p className="font-bold text-xl text-center mb-8">
                     [제목이 들어가는 자리]
                  </p>
                  
                  {Array.from({ length: 12 }).map((_, i) => (
                    <p key={i} className="text-justify indent-[10pt]">
                      동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세. 
                      무궁화 삼천리 화려강산 대한사람 대한으로 길이 보전하세.
                      이것은 미리보기 텍스트입니다. 실제 내보내기 결과물과 매우 유사하게 보일 것입니다.
                      여백과 줄 간격 설정을 변경하면 즉시 반영됩니다.
                      작가는 오직 글쓰기에만 집중하세요. 나머지는 Luie가 알아서 합니다.
                    </p>
                  ))}
                  
                  {/* Page Break Indicator (Visual only) */}
                  <div className="border-b border-dashed border-gray-300 my-8 relative">
                     <span className="absolute right-0 bottom-1 text-[8px] text-gray-400">PAGE BREAK PREVIEW</span>
                  </div>

                  <p className="text-justify indent-[10pt]">
                     다음 페이지 내용이 이어집니다. 워드프로세서와 동일한 환경을 경험하세요.
                  </p>
                </div>

                {/* Footer Simulation */}
                <div className="mt-auto pt-4 text-center text-[9pt] text-gray-500">
                   - 1 -
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
