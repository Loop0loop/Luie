import { useState } from "react";
import { 
  FileText, 
  Download, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Bold, 
  Italic, 
  Underline,
  Search,
  ChevronDown,
  Save,
  Undo,
  Redo,
  Palette,
  Globe
} from "lucide-react";
import { cn } from "../../../../shared/types/utils";

interface ExportPreviewPanelProps {
  title?: string;
  onClose?: () => void;
}

type ExportFormat = "hwp" | "word";

export default function ExportPreviewPanel({ title = "Untitled" }: ExportPreviewPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("hwp");

  const handleExport = () => {
    // Placeholder for actual export logic
    alert(`Exporting as .${format === "hwp" ? "hwp" : "docx"} (Coming Soon)`);
  };

  return (
    <div className="flex flex-col h-full bg-white text-black overflow-hidden relative border-l border-border">
      {/* Header / Selection & Actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-border shrink-0">
        <div className="flex items-center gap-2 bg-input/50 p-1 rounded-lg border border-border">
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              format === "hwp" ? "bg-white text-accent shadow-sm" : "text-muted hover:text-fg"
            )}
            onClick={() => setFormat("hwp")}
          >
            <span className="font-bold">한</span> 한글
          </button>
          <button
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
              format === "word" ? "bg-white text-blue-600 shadow-sm" : "text-muted hover:text-fg"
            )}
            onClick={() => setFormat("word")}
          >
             <FileText className="w-3.5 h-3.5" /> Word
          </button>
        </div>

        <button 
          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-md text-xs font-medium hover:brightness-110 transition-all shadow-sm"
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" />
          내보내기
        </button>
      </div>

      {/* Emulated UI Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {format === "hwp" ? (
          // HWP Style UI
          <div className="flex flex-col h-full bg-[#f0f0f0]">
            {/* Title Bar Equivalent */}
            <div className="bg-[#3e81f6] text-white px-2 py-1 text-[10px] flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className="font-bold">한글 2024</span>
                 <span className="opacity-80 mx-1">|</span>
                 <span>{title}.hwp</span>
               </div>
               <div className="flex gap-1.5">
                 <Undo className="w-3 h-3 opacity-80" />
                 <Redo className="w-3 h-3 opacity-80" />
                 <Save className="w-3 h-3 opacity-80" />
               </div>
            </div>
            
            {/* Menu Bar */}
            <div className="bg-white border-b border-gray-300 flex text-[11px] text-gray-700">
               {["파일", "편집", "보기", "입력", "서식", "쪽", "보안", "검토", "도구"].map(menu => (
                 <div key={menu} className="px-3 py-1.5 hover:bg-gray-100 cursor-default">{menu}</div>
               ))}
            </div>

            {/* Standard Toolbar */}
            <div className="bg-[#f0f0f0] border-b border-gray-300 p-1 flex items-center gap-1 shrink-0 overflow-x-auto whitespace-nowrap">
               <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-sm px-1 py-0.5">
                  <div className="w-3 h-3 bg-gray-400 rounded-sm opacity-50" />
                  <span className="text-[11px] font-medium text-gray-800 px-1 min-w-[50px]">바탕글</span>
                  <ChevronDown className="w-3 h-3 text-gray-500" />
               </div>
               <div className="w-px h-4 bg-gray-300 mx-1" />
               
               <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-sm px-1 py-0.5">
                 <span className="text-[11px] font-medium text-gray-800 px-1 min-w-[70px]">함초롬바탕</span>
                 <ChevronDown className="w-3 h-3 text-gray-500" />
               </div>
               
               <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-sm px-1 py-0.5 ml-1">
                 <span className="text-[11px] font-medium text-gray-800 px-1 min-w-[24px]">10</span>
                 <div className="flex flex-col -gap-1">
                   <ChevronDown className="w-2 h-2 text-gray-500 rotate-180" />
                   <ChevronDown className="w-2 h-2 text-gray-500" />
                 </div>
               </div>

               <div className="w-px h-4 bg-gray-300 mx-1" />

               <div className="flex items-center gap-0.5 text-gray-600">
                 <button className="p-1 hover:bg-gray-200 rounded"><Bold className="w-3.5 h-3.5" /></button>
                 <button className="p-1 hover:bg-gray-200 rounded"><Italic className="w-3.5 h-3.5" /></button>
                 <button className="p-1 hover:bg-gray-200 rounded"><Underline className="w-3.5 h-3.5" /></button>
               </div>
               
               <div className="w-px h-4 bg-gray-300 mx-1" />
               
               <div className="flex items-center gap-0.5 text-gray-600">
                  <button className="p-1 hover:bg-gray-200 rounded"><AlignLeft className="w-3.5 h-3.5" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><AlignCenter className="w-3.5 h-3.5" /></button>
                  <button className="p-1 hover:bg-gray-200 rounded"><AlignRight className="w-3.5 h-3.5" /></button>
               </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-[#d6d6d6] p-4 flex justify-center items-start">
               <div 
                 className="bg-white shadow-lg text-black px-8 py-10 text-[10px] leading-relaxed relative"
                 style={{
                   width: "100%",
                   maxWidth: "210mm",
                   minHeight: "297mm",
                   transform: "scale(0.8)",
                   transformOrigin: "top center"
                 }}
               >
                  {/* Page Margin Guidelines (Corner) */}
                  <div className="absolute top-8 left-8 w-4 h-4 border-t border-l border-gray-300" />
                  <div className="absolute top-8 right-8 w-4 h-4 border-t border-r border-gray-300" />
                  <div className="absolute bottom-8 left-8 w-4 h-4 border-b border-l border-gray-300" />
                  <div className="absolute bottom-8 right-8 w-4 h-4 border-b border-r border-gray-300" />

                  <h1 className="text-xl font-bold mb-6 text-center">{title}</h1>
                  <p className="mb-2">
                    이 문서는 한글(HWP) 스타일 미리보기입니다.
                  </p>
                  <p>
                    동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세.
                    무궁화 삼천리 화려강산 대한사람 대한으로 길이 보전하세.
                  </p>
               </div>
            </div>

            {/* Status Bar */}
            <div className="bg-[#f0f0f0] border-t border-gray-300 h-6 flex items-center px-2 text-[10px] text-gray-600 justify-between shrink-0">
               <div className="flex gap-3">
                 <span>1/1 쪽</span>
                 <span>1단</span>
                 <span>배치: 글자</span>
               </div>
               <div className="flex gap-3">
                 <span>삽입</span>
                 <span>변경 내용 추적</span>
                 <span>100%</span>
               </div>
            </div>
          </div>
        ) : (
          // Word Style UI
          <div className="flex flex-col h-full bg-[#f3f4f6]">
            {/* Word Header */}
            <div className="bg-[#185abd] text-white px-3 py-1.5 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-3">
                 <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-[1px]" />
                    ))}
                 </div>
                 <span className="font-semibold text-sm">Word</span>
                 <span className="text-xs opacity-80">{title}</span>
               </div>
               <div className="w-1/3 bg-white/20 rounded px-2 py-0.5 flex items-center gap-2 text-xs">
                  <Search className="w-3 h-3" />
                  <span className="opacity-70">검색</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-1 rounded">PREMIUM</span>
                  <div className="w-6 h-6 rounded-full bg-blue-300 flex items-center justify-center text-xs font-bold text-blue-900">U</div>
               </div>
            </div>

            {/* Ribbon Tabs */}
            <div className="bg-white border-b border-gray-200 px-2 flex text-[12px] text-gray-600">
               {["파일", "홈", "삽입", "그리기", "레이아웃", "참조", "검토", "보기", "도움말"].map(menu => (
                 <div 
                   key={menu} 
                   className={cn(
                     "px-3 py-2 cursor-pointer border-b-2 border-transparent hover:text-blue-700 hover:bg-gray-50",
                     menu === "홈" && "text-blue-700 border-blue-700 font-medium"
                   )}
                 >
                   {menu}
                 </div>
               ))}
            </div>

            {/* Ribbon Toolbar */}
            <div className="bg-[#f9f9f9] border-b border-gray-200 p-2 flex items-center gap-2 shrink-0 overflow-x-auto whitespace-nowrap h-20">
               {/* Undo/Clipboard Group */}
               <div className="flex flex-col items-center gap-1 pr-2 border-r border-gray-300">
                  <div className="flex gap-1">
                    <Undo className="w-4 h-4 text-gray-600" />
                    <Redo className="w-4 h-4 text-gray-600 opacity-50" />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">실행 취소</span>
               </div>

               {/* Font Group */}
               <div className="flex flex-col gap-1 px-2 border-r border-gray-300">
                  <div className="flex items-center gap-1 mb-1">
                    <div className="bg-white border border-gray-300 px-1 py-0.5 rounded text-[11px] w-24 flex justify-between items-center">
                       Calibri <ChevronDown className="w-3 h-3" />
                    </div>
                    <div className="bg-white border border-gray-300 px-1 py-0.5 rounded text-[11px] w-10 flex justify-between items-center">
                       11 <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-gray-700">
                     <Bold className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <Italic className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <Underline className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <span className="text-gray-300">|</span>
                     <Palette className="w-4 h-4 p-0.5 rounded hover:bg-gray-200 text-red-500" />
                  </div>
               </div>

               {/* Paragraph Group */}
               <div className="flex flex-col gap-1 px-2 border-r border-gray-300">
                  <div className="flex items-center gap-1 text-gray-700 mb-1">
                     <span className="w-4 h-4 bg-gray-300 rounded-sm" /> 
                     <span className="w-4 h-4 bg-gray-300 rounded-sm" /> 
                  </div>
                  <div className="flex items-center gap-1 text-gray-700">
                     <AlignLeft className="w-4 h-4 p-0.5 rounded bg-gray-200" />
                     <AlignCenter className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                     <AlignRight className="w-4 h-4 p-0.5 rounded hover:bg-gray-200" />
                  </div>
               </div>

               {/* Styles Group */}
               <div className="flex items-center gap-1 px-2">
                  <div className="flex flex-col items-center bg-white border border-gray-300 rounded p-1 w-12 h-14 justify-center">
                     <span className="text-[16px] font-light">AaBbCc</span>
                     <span className="text-[10px] text-blue-600">표준</span>
                  </div>
                  <div className="flex flex-col items-center hover:bg-white hover:border border-transparent border rounded p-1 w-12 h-14 justify-center">
                     <span className="text-[16px] font-light">AaBbCc</span>
                     <span className="text-[10px] text-gray-600">간격 없음</span>
                  </div>
                  <div className="flex flex-col items-center hover:bg-white hover:border border-transparent border rounded p-1 w-12 h-14 justify-center">
                     <span className="text-[16px] font-light text-blue-600">AaBbCc</span>
                     <span className="text-[10px] text-gray-600">제목 1</span>
                  </div>
               </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 overflow-auto bg-[#eaddd7] p-4 flex justify-center items-start">
               <div 
                 className="bg-white shadow-lg text-black px-8 py-10 text-[11px] leading-relaxed relative"
                 style={{
                   width: "100%",
                   maxWidth: "210mm",
                   minHeight: "297mm",
                   transform: "scale(0.8)",
                   transformOrigin: "top center"
                 }}
               >
                  <h1 className="text-2xl font-bold mb-4 text-blue-900">{title}</h1>
                  <p className="mb-2">
                    This is a preview of the Microsoft Word style export.
                  </p>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
                    terms incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                    quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                  </p>
               </div>
            </div>

            {/* Word Status Bar */}
            <div className="bg-[#185abd] text-white h-6 flex items-center px-4 text-[10px] justify-between shrink-0">
               <div className="flex gap-4">
                 <span>1페이지(전체 1)</span>
                 <span>45 단어</span>
                 <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> 한국어</span>
               </div>
               <div className="flex gap-4 items-center">
                 <span>접근성: 검토 필요</span>
                 <div className="flex gap-2">
                    <span className="hover:bg-white/20 p-0.5 rounded cursor-pointer">읽기 모드</span>
                    <span className="bg-white/20 p-0.5 rounded cursor-pointer">인쇄 모양</span>
                    <span className="hover:bg-white/20 p-0.5 rounded cursor-pointer">웹 모양</span>
                 </div>
                 <span>100%</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
