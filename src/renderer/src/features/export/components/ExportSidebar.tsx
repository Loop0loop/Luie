import type { ElementType } from "react";
import type { TFunction } from "i18next";
import { Download, FileText, Layout, Type, AlignJustify, Info, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@shared/types/utils";

const IS_MACOS = navigator.userAgent.toLowerCase().includes("mac");
const IS_WINDOWS = navigator.userAgent.toLowerCase().includes("win");

const SectionHeader = ({
  id,
  title,
  icon: Icon,
  expanded,
  onToggle,
}: {
  id: string;
  title: string;
  icon: ElementType;
  expanded: boolean;
  onToggle: (id: string) => void;
}) => (
  <button
    type="button"
    className="flex items-center justify-between w-full px-3 py-2 rounded-control hover:bg-surface-hover/60 transition-colors text-left select-none"
    onClick={() => onToggle(id)}
    style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
  >
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted" />
      <span className="font-medium text-xs text-fg">{title}</span>
    </div>
    {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted/70" /> : <ChevronRight className="w-3.5 h-3.5 text-muted/70" />}
  </button>
);

interface ExportSidebarProps {
  t: TFunction;
  isExporting: boolean;
  hasChapter: boolean;
  format: "word" | "hwp";
  setFormat: (val: "word" | "hwp") => void;
  paperSize: string;
  setPaperSize: (val: string) => void;
  marginTop: number;
  setMarginTop: (val: number) => void;
  marginBottom: number;
  setMarginBottom: (val: number) => void;
  marginLeft: number;
  setMarginLeft: (val: number) => void;
  lineHeight: string;
  setLineHeight: (val: string) => void;
  fontFamily: string;
  setFontFamily: (val: string) => void;
  normalizeLineSpacing: boolean;
  setNormalizeLineSpacing: (val: boolean) => void;
  showPageNumbers: boolean;
  setShowPageNumbers: (val: boolean) => void;
  startPageNumber: number;
  setStartPageNumber: (val: number) => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (id: string) => void;
  handleExport: () => void;
}

export function ExportSidebar({
  t,
  isExporting,
  hasChapter,
  format,
  setFormat,
  paperSize,
  setPaperSize,
  marginTop,
  setMarginTop,
  marginBottom,
  setMarginBottom,
  marginLeft,
  setMarginLeft,
  lineHeight,
  setLineHeight,
  fontFamily,
  setFontFamily,
  normalizeLineSpacing,
  setNormalizeLineSpacing,
  showPageNumbers,
  setShowPageNumbers,
  startPageNumber,
  setStartPageNumber,
  expandedSections,
  toggleSection,
  handleExport,
}: ExportSidebarProps) {
  return (
    <div className="w-[280px] sm:w-[290px] bg-sidebar/70 backdrop-blur-2xl backdrop-saturate-150 border border-border/40 rounded-panel shadow-panel flex flex-col h-full shrink-0 select-none overflow-hidden">
      {/* Top Titlebar / Traffic Light Line.
          NOTE: 창 프레임(p-2=8px) 안에서 패널 로컬 좌표로 트래픽 라이트와 정렬한다.
          라이트 그룹은 창 좌표 (16,16)~(68,28) — h-7(28px) 행의 세로 중앙(14px)+8px가
          라이트 중심 y=22와 맞고, pl-[72px]+8px는 위저드 pl-20과 같은 창 기준 80px
          클리어런스다. Windows도 frameless라 이 줄이 드래그 핸들이 된다(버튼은 우측
          미리보기 위 인앱 버튼). Linux 등 나머지 플랫폼은 네이티브 타이틀바가 있다. */}
      {(IS_MACOS || IS_WINDOWS) && (
        <div
          className={`h-7 flex items-center pr-2 shrink-0 ${
            IS_MACOS ? "pl-[72px]" : "pl-2"
          }`}
          style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
        >
          <span className="text-[12px] font-semibold text-fg tracking-tight">
            {t("exportWindow.header.title")}
          </span>
        </div>
      )}

      {/* Main Inspector Scroll Area - Clean list without heavy inner box bgs */}
      <div
        className="flex-1 overflow-y-auto px-1 py-2 space-y-3 custom-scrollbar"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Format Section */}
        <div className="space-y-1.5">
          <SectionHeader
            id="format"
            title={t("exportWindow.sections.format")}
            icon={FileText}
            expanded={expandedSections.format}
            onToggle={toggleSection}
          />
          {expandedSections.format && (
            <div className="grid grid-cols-2 gap-1.5 px-1">
              <button
                type="button"
                onClick={() => setFormat("hwp")}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-control transition-all relative",
                  format === "hwp"
                    ? "bg-accent/15 text-accent font-semibold shadow-xs ring-1 ring-accent/30"
                    : "bg-surface/80 hover:bg-surface text-muted",
                )}
              >
                <span className="text-xs mb-0.5">{t("exportWindow.format.hwp_label")}</span>
                <span className="text-[10px] opacity-75">{t("exportWindow.format.hwp")}</span>
                <span className="absolute top-1 right-1 text-[8px] px-1 py-0.2 bg-accent text-on-accent rounded-full font-bold">
                  {t("exportWindow.format.beta")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("word")}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-control transition-all",
                  format === "word"
                    ? "bg-accent/15 text-accent font-semibold shadow-xs ring-1 ring-accent/30"
                    : "bg-surface/80 hover:bg-surface text-muted",
                )}
              >
                <span className="text-xs mb-0.5">{t("exportWindow.format.docx_label")}</span>
                <span className="text-[10px] opacity-75">{t("exportWindow.format.word")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Page Setup Section */}
        <div className="space-y-1.5">
          <SectionHeader
            id="page"
            title={t("exportWindow.sections.page")}
            icon={Layout}
            expanded={expandedSections.page}
            onToggle={toggleSection}
          />
          {expandedSections.page && (
            <div className="space-y-2.5 px-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">
                  {t("exportWindow.page.paperSize")}
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="w-full h-8 bg-surface hover:bg-surface-hover/80 rounded-control px-2 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                >
                  <option value="A4">{t("exportWindow.page.paperOptions.a4")}</option>
                  <option value="Letter">{t("exportWindow.page.paperOptions.letter")}</option>
                  <option value="B5">{t("exportWindow.page.paperOptions.b5")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">
                  {t("exportWindow.page.margins")}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted/80 pl-0.5">{t("exportWindow.page.marginTop")}</label>
                    <input
                      type="number"
                      value={marginTop}
                      onChange={(e) => setMarginTop(Number(e.target.value))}
                      className="w-full h-7.5 bg-surface hover:bg-surface-hover/80 rounded-control px-2 text-xs text-center text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted/80 pl-0.5">{t("exportWindow.page.marginBottom")}</label>
                    <input
                      type="number"
                      value={marginBottom}
                      onChange={(e) => setMarginBottom(Number(e.target.value))}
                      className="w-full h-7.5 bg-surface hover:bg-surface-hover/80 rounded-control px-2 text-xs text-center text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted/80 pl-0.5">{t("exportWindow.page.marginLeft")}</label>
                    <input
                      type="number"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(Number(e.target.value))}
                      className="w-full h-7.5 bg-surface hover:bg-surface-hover/80 rounded-control px-2 text-xs text-center text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] text-muted/80 pl-0.5">{t("exportWindow.page.marginRight")}</label>
                    <input
                      type="number"
                      value={marginLeft}
                      onChange={(e) => setMarginLeft(Number(e.target.value))}
                      className="w-full h-7.5 bg-surface hover:bg-surface-hover/80 rounded-control px-2 text-xs text-center text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Typography Section */}
        <div className="space-y-1.5">
          <SectionHeader
            id="typography"
            title={t("exportWindow.sections.typography")}
            icon={Type}
            expanded={expandedSections.typography}
            onToggle={toggleSection}
          />
          {expandedSections.typography && (
            <div className="space-y-2.5 px-1">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">
                  {t("exportWindow.typography.font")}
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full h-8 bg-surface hover:bg-surface-hover/80 rounded-control px-2 text-xs text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                >
                  <option value="Batang">{t("exportWindow.typography.fontOptions.batang")}</option>
                  <option value="Malgun Gothic">{t("exportWindow.typography.fontOptions.malgun")}</option>
                  <option value="Nanum Myeongjo">{t("exportWindow.typography.fontOptions.nanum")}</option>
                </select>
                <div className="flex items-start gap-1 px-1 py-0.5 text-[10px] text-muted/80 leading-tight">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{t("exportWindow.typography.fontHint")}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted">
                  {t("exportWindow.typography.lineHeight")}
                </label>
                <div className="grid grid-cols-4 gap-1 bg-surface p-0.5 rounded-control">
                  {["100%", "160%", "180%", "200%"].map((lh) => (
                    <button
                      key={lh}
                      type="button"
                      onClick={() => setLineHeight(lh)}
                      className={cn(
                        "py-1 text-xs rounded transition-colors",
                        lineHeight === lh
                          ? "bg-panel text-fg font-medium shadow-xs"
                          : "text-muted hover:text-fg",
                      )}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-control bg-surface/70 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <label className="text-xs font-medium text-fg">
                      {t("exportWindow.typography.normalizeLineSpacing")}
                    </label>
                    <p className="text-[10px] leading-relaxed text-muted">
                      {t("exportWindow.typography.normalizeLineSpacingHint")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNormalizeLineSpacing(!normalizeLineSpacing)}
                    className={cn(
                      "relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors focus:outline-none",
                      normalizeLineSpacing ? "bg-accent" : "bg-muted/40",
                    )}
                    aria-pressed={normalizeLineSpacing}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform",
                        normalizeLineSpacing ? "translate-x-4" : "translate-x-0.5",
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Header & Page Number Section */}
        <div className="space-y-1.5">
          <SectionHeader
            id="header"
            title={t("exportWindow.sections.header")}
            icon={AlignJustify}
            expanded={expandedSections.header}
            onToggle={toggleSection}
          />
          {expandedSections.header && (
            <div className="space-y-2 px-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-fg">{t("exportWindow.headerSettings.showPageNumbers")}</label>
                <input
                  type="checkbox"
                  checked={showPageNumbers}
                  onChange={(e) => setShowPageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded border-0 bg-surface text-accent focus:ring-1 focus:ring-accent cursor-pointer"
                />
              </div>
              {showPageNumbers && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="text-xs text-muted">{t("exportWindow.headerSettings.startPage")}</label>
                  <input
                    type="number"
                    min="1"
                    value={startPageNumber}
                    onChange={(e) => setStartPageNumber(Number(e.target.value))}
                    className="w-14 h-7 bg-surface rounded-control px-2 text-xs text-center text-fg focus:outline-none focus:ring-1 focus:ring-accent border-0"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Export Action Button */}
      <div className="px-2 pb-2 pt-2 shrink-0">
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || !hasChapter}
          className="w-full h-9.5 bg-accent hover:bg-accent-hover text-on-accent font-medium rounded-control transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold">
            {isExporting
              ? t("exportWindow.button.exporting")
              : t("exportWindow.button.export", { format: format === "hwp" ? "HWP" : "Word" })}
          </span>
        </button>
      </div>
    </div>
  );
}

