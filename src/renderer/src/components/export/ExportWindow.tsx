import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [chapterId] = useState<string | null>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("chapterId");
    // "undefined" 문자열이거나 빈 값이면 null 반환
    if (!id || id === "undefined" || id === "null") {
      return null;
    }
    return id;
  });

  // Chapter data
  const [chapter, setChapter] = useState<{ title: string; content: string; projectId: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Set dark theme for window wrapper to ensure modal looks good
    document.documentElement.setAttribute("data-theme", "dark");
    
    // Load chapter data
    if (!chapterId) {
      setLoadError(t("exportWindow.error.missingChapterId"));
      return;
    }

    window.api.chapter.get(chapterId).then(response => {
      if (response.success && response.data) {
        setChapter({
          title: response.data.title,
          content: response.data.content || "",
          projectId: response.data.projectId,
        });
      } else {
        setLoadError(response.error?.message || t("exportWindow.error.loadFailed"));
      }
    }).catch((error) => {
      setLoadError(error instanceof Error ? error.message : t("exportWindow.error.unknown"));
    });
  }, [chapterId, t]);

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
      alert(t("exportWindow.error.noChapter"));
      return;
    }

    setIsExporting(true);

    try {
      const response = await window.api.export.create({
        projectId: chapter.projectId,
        chapterId,
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

      if (response.success && response.data) {
        const result = response.data as { success: boolean; filePath?: string; error?: string; message?: string };
        if (result.success) {
          // Show message if provided (e.g., HWPX conversion instructions)
          const message = result.message 
            ? result.message
            : t("exportWindow.alert.success", { path: result.filePath ?? "" });
          alert(message);
        } else {
          alert(t("exportWindow.alert.failed", { reason: result.error || "Unknown error" }));
        }
      } else {
        alert(t("exportWindow.alert.failed", { reason: response.error?.message || "Unknown error" }));
      }
    } catch (error) {
      void window.api.logger.error("Export error", {
        error: error instanceof Error ? error.message : String(error),
      });
      alert(t("exportWindow.alert.exception", { reason: error instanceof Error ? error.message : "Unknown error" }));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-canvas text-fg overflow-hidden select-none font-sans">
      {/* 1. Window Bar */}
      <div className="shrink-0 bg-panel border-b border-border">
        <WindowBar title={t("exportWindow.title")}/>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. Left Panel: Control */}
        <div className="w-[320px] bg-panel border-r border-border flex flex-col h-full overflow-y-auto custom-scrollbar">

          {/* Header */}
          <div className="p-5 border-b border-border bg-panel sticky top-0 z-10">
            <h1 className="text-xl font-bold text-fg flex items-center gap-2">
              <Download className="w-5 h-5 text-accent" />
              {t("exportWindow.header.title")}
            </h1>
            <p className="text-xs text-muted mt-1">
              {t("exportWindow.header.subtitle")}
            </p>
          </div>

          {/* Settings Content */}
          <div className="p-2 space-y-1">

            {/* Format Selection */}
            <div className="bg-idk rounded overflow-hidden">
              <SectionHeader
                id="format"
                title={t("exportWindow.sections.format")}
                icon={FileText}
                expanded={expandedSections.format}
                onToggle={toggleSection}
              />
              {expandedSections.format && (
                <div className="p-3 gap-2 grid grid-cols-2">
                  <button
                    onClick={() => setFormat("hwp")}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded border transition-all relative",
                      format === "hwp"
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-surface border-transparent hover:bg-surface-hover text-muted"
                    )}
                  >
                    <span className="font-bold text-lg mb-1">HWPX</span>
                    <span className="text-[10px] opacity-80">{t("exportWindow.format.hwp")}</span>
                    <span className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 bg-accent text-white rounded font-bold">{t("exportWindow.format.beta")}</span>
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
                    <span className="text-[10px] opacity-80">{t("exportWindow.format.word")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Page Setup */}
            <div className="bg-idk rounded overflow-hidden">
              <SectionHeader
                id="page"
                title={t("exportWindow.sections.page")}
                icon={Layout}
                expanded={expandedSections.page}
                onToggle={toggleSection}
              />
              {expandedSections.page && (
                <div className="p-4 space-y-4">
                  {/* Paper Size */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t("exportWindow.page.paperSize")}</label>
                    <select
                      value={paperSize}
                      onChange={(e) => setPaperSize(e.target.value)}
                      className="w-full h-9 bg-surface border border-border rounded px-3 text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="A4">{t("exportWindow.page.paperOptions.a4")}</option>
                      <option value="Letter">{t("exportWindow.page.paperOptions.letter")}</option>
                      <option value="B5">{t("exportWindow.page.paperOptions.b5")}</option>
                    </select>
                  </div>

                  {/* Margins */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
                      {t("exportWindow.page.margins")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">{t("exportWindow.page.marginTop")}</label>
                        <input
                          type="number"
                          value={marginTop}
                          onChange={(e) => setMarginTop(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">{t("exportWindow.page.marginBottom")}</label>
                        <input
                          type="number"
                          value={marginBottom}
                          onChange={(e) => setMarginBottom(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">{t("exportWindow.page.marginLeft")}</label>
                        <input
                          type="number"
                          value={marginLeft}
                          onChange={(e) => setMarginLeft(Number(e.target.value))}
                          className="w-full h-8 bg-surface border border-border rounded px-2 text-sm text-center text-fg focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-subtle pl-1">{t("exportWindow.page.marginRight")}</label>
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
                title={t("exportWindow.sections.typography")}
                icon={Type}
                expanded={expandedSections.typography}
                onToggle={toggleSection}
              />
              {expandedSections.typography && (
                <div className="p-4 space-y-4">
                  {/* Font Family */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t("exportWindow.typography.font")}</label>
                    <div className="space-y-1">
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        className="w-full h-9 bg-surface border border-border rounded px-3 text-sm text-fg focus:border-accent focus:outline-none"
                      >
                        <option value="Batang">{t("exportWindow.typography.fontOptions.batang")}</option>
                        <option value="Malgun Gothic">{t("exportWindow.typography.fontOptions.malgun")}</option>
                        <option value="Nanum Myeongjo">{t("exportWindow.typography.fontOptions.nanum")}</option>
                      </select>
                      <div className="flex items-start gap-1.5 px-1 py-1.5 bg-surface/50 rounded text-[11px] text-muted leading-tight">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{t("exportWindow.typography.fontHint")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wider">{t("exportWindow.typography.lineHeight")}</label>
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
                title={t("exportWindow.sections.header")}
                icon={AlignJustify}
                expanded={expandedSections.header}
                onToggle={toggleSection}
              />
              {expandedSections.header && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-fg">{t("exportWindow.headerSettings.showPageNumbers")}</label>
                    <input
                      type="checkbox"
                      checked={showPageNumbers}
                      onChange={(e) => setShowPageNumbers(e.target.checked)}
                      className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent"
                    />
                  </div>
                  {showPageNumbers && (
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-muted">{t("exportWindow.headerSettings.startPage")}</label>
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
              {isExporting ? t("exportWindow.button.exporting") : t("exportWindow.button.export", { format: format.toUpperCase() })}
            </button>
          </div>
        </div>

        {/* 3. Right Panel: Preview Area */}
        <div className="flex-1 bg-canvas relative flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="h-10 border-b border-border bg-panel flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="bg-surface px-2 py-0.5 rounded text-fg border border-border">100%</span>
              <span>{t("exportWindow.preview.label")}</span>
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
                  lineHeight,
                }}
              >
                {loadError ? (
                  <div className="text-center mt-20">
                    <div className="text-red-600 font-bold mb-2">{t("exportWindow.preview.errorTitle")}</div>
                    <div className="text-gray-600">{loadError}</div>
                  </div>
                ) : chapter ? (
                  <>
                    <h1 className="text-2xl font-bold text-center mb-10">{chapter.title}</h1>
                    <div 
                      dangerouslySetInnerHTML={{ __html: chapter.content }} 
                      className="prose prose-sm max-w-none"
                    />
                  </>
                ) : (
                  <div className="text-center text-gray-400 mt-20">
                    {t("exportWindow.preview.loading")}
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
