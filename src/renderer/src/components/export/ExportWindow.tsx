import { useState, useEffect } from "react";
import {
  Download,
  FileText,
  Layout,
  Type,
  AlignJustify,
  Info,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import WindowBar from "../layout/WindowBar";
import { cn } from "../../../../shared/types/utils";

/**
 * Helper Component for Accordion Headers
 */
const SectionHeader = ({
  id,
  title,
  icon: Icon,
  expanded,
  onToggle
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: (id: string) => void
}) => (
  <button
    className="flex items-center justify-between w-full p-4 hover:bg-surface-hover transition-colors text-left border-b border-border"
    onClick={() => onToggle(id)}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4 text-muted" />
      <span className="font-medium text-sm text-fg">{title}</span>
    </div>
    {expanded ? <ChevronDown className="w-4 h-4 text-subtle" /> : <ChevronRight className="w-4 h-4 text-subtle" />}
  </button>
);

export default function ExportWindow() {
  const [chapterId] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("chapterId");
  });

  // Chapter data
  const [chapter, setChapter] = useState<{ title: string; content: string; projectId: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Set dark theme for window wrapper to ensure modal looks good
    document.documentElement.setAttribute("data-theme", "dark");
    
    // Load chapter data
    if (chapterId) {
      window.api.chapter.get(chapterId).then(response => {
        if (response.success && response.data) {
          setChapter({
            title: response.data.title,
            content: response.data.content || "",
            projectId: response.data.projectId,
          });
        }
      });
    }
  }, [chapterId]);

  // Settings State
  const [format, setFormat] = useState<"word" | "hwp">("hwp"); // Default to HWP
  const [paperSize, setPaperSize] = useState("A4");
  const [marginTop, setMarginTop] = useState(20);
  const [marginBottom, setMarginBottom] = useState(15);
  const [marginLeft, setMarginLeft] = useState(20); // also used for right
  const [lineHeight, setLineHeight] = useState("160%");
  const [fontFamily, setFontFamily] = useState("Batang");

  // Page Number State
  const [showPageNumbers, setShowPageNumbers] = useState(true);
  const [startPageNumber, setStartPageNumber] = useState(1);

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

  const handleExport = async () => {
    if (!chapter || !chapterId) {
      alert("챕터 정보를 불러올 수 없습니다.");
      return;
    }

    setIsExporting(true);

    try {
      const response = await window.api.export.create({
        projectId: chapter.projectId,
        chapterId: chapterId,
        title: chapter.title,
        content: chapter.content,
        format: format === "hwp" ? "HWPX" : "DOCX",
        paperSize: paperSize as "A4" | "Letter" | "B5",
        marginTop,
        marginBottom,
        marginLeft,
        marginRight: marginLeft, // Use same as left
        fontFamily,
        fontSize: 10, // Fixed for now
        lineHeight,
        showPageNumbers,
        startPageNumber,
      });

      if (response.success && response.data?.success) {
        alert(`내보내기가 완료되었습니다!\n저장 위치: ${response.data.filePath}`);
      } else {
        alert(`내보내기에 실패했습니다.\n${response.data?.error || response.error?.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      alert(`내보내기 중 오류가 발생했습니다.\n${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-canvas text-fg overflow-hidden select-none font-sans">
      {/* 1. Window Bar */}
      <div className="shrink-0 bg-panel border-b border-border">
        <WindowBar title="내보내기 미리보기" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. Left Panel: Control */}
        <div className="w-[320px] bg-panel border-r border-border flex flex-col h-full overflow-y-auto custom-scrollbar">

          {/* Header */}
          <div className="p-5 border-b border-border bg-panel sticky top-0 z-10">
            <h1 className="text-xl font-bold text-fg flex items-center gap-2">
              <Download className="w-5 h-5 text-accent" />
              내보내기 설정
            </h1>
            <p className="text-xs text-muted mt-1">
              문서 형식을 선택하고 스타일을 조정하세요.
            </p>
          </div>

          {/* Settings Content */}
          <div className="p-2 space-y-1">

            {/* Format Selection */}
            <div className="bg-idk rounded overflow-hidden">
              <SectionHeader
                id="format"
                title="파일 형식"
                icon={FileText}
                expanded={expandedSections.format}
                onToggle={toggleSection}
              />
              {expandedSections.format && (
                <div className="p-3 gap-2 grid grid-cols-2">
                  <button
                    onClick={() => setFormat("hwp")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded border transition-all",
                      format === "hwp"
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-surface border-transparent hover:bg-surface-hover text-muted"
                    )}
                  >
                    <span className="font-bold text-lg mb-1">HWP</span>
                    <span className="text-[10px] opacity-80">한글 문서</span>
                  </button>
                  <button
                    onClick={() => setFormat("word")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded border transition-all",
                      format === "word"
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-surface border-transparent hover:bg-surface-hover text-muted"
                    )}
                  >
                    <span className="font-bold text-lg mb-1">Word</span>
                    <span className="text-[10px] opacity-80">MS Word</span>
                  </button>
                </div>
              )}
            </div>

            {/* Page Setup */}
            <div className="bg-idk rounded overflow-hidden">
              <SectionHeader
                id="page"
                title="용지 설정"
                icon={Layout}
                expanded={expandedSections.page}
                onToggle={toggleSection}
              />
              {expandedSections.page && (
                <div className="p-4 space-y-4">
                  {/* Paper Size */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">용지 크기</label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full h-9 bg-surface border border-border rounded px-3 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="A4">A4 (210 x 297 mm)</option>
                      <option value="Letter">Letter (216 x 279 mm)</option>
                      <option value="B5">B5 (176 x 250 mm)</option>
                    </select>
                  </div>

                  {/* Margins */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
                      여백 (mm)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">위쪽</label>
                        <input
                          type="number"
                          value={marginTop}
                          onChange={(e) => setMarginTop(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">아래쪽</label>
                        <input
                          type="number"
                          value={marginBottom}
                          onChange={(e) => setMarginBottom(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">왼쪽</label>
                        <input
                          type="number"
                          value={marginLeft}
                          onChange={(e) => setMarginLeft(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">오른쪽</label>
                        <input
                          type="number"
                          value={marginLeft}
                          onChange={(e) => setMarginLeft(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Typography */}
            <div className="bg-idk rounded overflow-hidden">
              <SectionHeader
                id="typography"
                title="글꼴 및 줄 간격"
                icon={Type}
                expanded={expandedSections.typography}
                onToggle={toggleSection}
              />
              {expandedSections.typography && (
                <div className="p-4 space-y-4">
                  {/* Font Family */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">글꼴</label>
                    <div className="space-y-1">
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full h-9 bg-surface border border-border rounded px-3 text-sm text-fg focus:border-accent focus:outline-none"
                      >
                        <option value="Batang">바탕 (Batang)</option>
                        <option value="Malgun Gothic">맑은 고딕</option>
                        <option value="Nanum Myeongjo">나눔명조</option>
                      </select>
                      <div className="flex items-start gap-1.5 px-1 py-1.5 bg-surface/50 rounded text-[11px] text-muted leading-tight">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>OS에 해당 폰트가 없을 경우, 가장 유사한 명조/고딕체로 대체됩니다.</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">줄 간격</label>
                    <div className="flex bg-surface rounded p-1 border border-border">
                      {["100%", "160%", "180%", "200%"].map((lh) => (
                        <button
                          key={lh}
                          onClick={() => setLineHeight(lh)}
                          className={cn(
                            "flex-1 py-1.5 text-xs rounded transition-colors",
                            lineHeight === lh
                              ? "bg-accent text-white font-medium"
                              : "text-muted hover:text-fg"
                          )}
                        >
                          {lh}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Header/Footer (Page Numbers) */}
            <div className="bg-idk rounded overflow-hidden">
              <SectionHeader
                id="header"
                title="머리말 / 꼬리말"
                icon={AlignJustify}
                expanded={expandedSections.header}
                onToggle={toggleSection}
              />
              {expandedSections.header && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-fg">쪽 번호 표시</label>
                    <input
                      type="checkbox"
                      checked={showPageNumbers}
                      onChange={(e) => setShowPageNumbers(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent"
                    />
                  </div>
                  {showPageNumbers && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted">시작 번호</label>
                      <input
                        type="number"
                        min="1"
                        value={startPageNumber}
                        onChange={(e) => setStartPageNumber(Number(e.target.value))}
                        className="w-16 h-7 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Export Button */}
          <div className="p-4 mt-auto border-t border-border bg-panel">
            <button 
              onClick={handleExport}
              disabled={isExporting || !chapter}
              className="w-full h-11 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              {isExporting ? "내보내는 중..." : `내보내기 (${format.toUpperCase()})`}
            </button>
          </div>
        </div>

        {/* 3. Right Panel: Preview Area */}
        <div className="flex-1 bg-canvas relative flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="h-10 border-b border-border bg-panel flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="bg-surface px-2 py-0.5 rounded text-fg border border-border">100%</span>
              <span>미리보기</span>
            </div>
          </div>

          {/* Canvas Scroll Area */}
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 custom-scrollbar bg-canvas">
            {/* Page Rendering */}
            <div
              className="bg-white shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 relative shrink-0"
              style={{
                width: paperSize === "A4" ? "210mm" : paperSize === "Letter" ? "216mm" : "176mm",
                minHeight: paperSize === "A4" ? "297mm" : paperSize === "Letter" ? "279mm" : "250mm",
                paddingTop: `${marginTop}mm`,
                paddingBottom: `${marginBottom}mm`,
                paddingLeft: `${marginLeft}mm`,
                paddingRight: `${marginLeft}mm`,
                marginTop: "10px",
                marginBottom: "40px"
              }}
            >
              {/* Content Preview */}
              <div
                className="w-full h-full text-black whitespace-pre-wrap outline-none"
                style={{
                  fontFamily: fontFamily.includes("Batang") ? "Batang, serif" : fontFamily,
                  fontSize: "10.5pt",
                  lineHeight: lineHeight,
                }}
              >
                {chapter ? (
                  <>
                    <h1 className="text-2xl font-bold text-center mb-10">{chapter.title}</h1>
                    <div 
                      dangerouslySetInnerHTML={{ __html: chapter.content }} 
                      className="prose prose-sm max-w-none"
                    />
                  </>
                ) : (
                  <div className="text-center text-gray-400 mt-20">
                    챕터를 불러오는 중...
                  </div>
                )}
              </div>

              {/* Page Number Footer */}
              {showPageNumbers && (
                <div
                  className="absolute bottom-0 left-0 w-full flex items-center justify-center text-[10pt] text-black pointer-events-none"
                  style={{
                    height: `${marginBottom}mm`,
                    fontFamily: fontFamily.includes("Batang") ? "Batang, serif" : fontFamily,
                  }}
                >
                  - {startPageNumber} -
                </div>
              )}
            </div>

            {/* Second Page Ghost (Visual Cue) */}
            <div
              className="bg-white/80 shadow-[0_0_20px_rgba(0,0,0,0.5)] relative shrink-0 opacity-50 pointer-events-none"
              style={{
                width: paperSize === "A4" ? "210mm" : paperSize === "Letter" ? "216mm" : "176mm",
                height: "100mm", // Just a partial view
                background: "linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%)"
              }}
            >
              {showPageNumbers && (
                <div
                  className="absolute bottom-4 left-0 w-full flex items-center justify-center text-[10pt] text-black"
                >
                  - {startPageNumber + 1} -
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
