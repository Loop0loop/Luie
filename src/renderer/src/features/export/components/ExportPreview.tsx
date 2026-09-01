import type { TFunction } from "i18next";
import "@renderer/styles/components/editor.css";

interface ExportPreviewProps {
  t: TFunction;
  chapter: { title: string; content: string } | null;
  loadError: string | null;
  paperSize: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  fontFamily: string;
  lineHeight: string;
  normalizeLineSpacing: boolean;
  sanitizedPreviewContent: string;
  showPageNumbers: boolean;
  startPageNumber: number;
}

export function ExportPreview({
  t,
  chapter,
  loadError,
  paperSize,
  marginTop,
  marginBottom,
  marginLeft,
  fontFamily,
  lineHeight,
  normalizeLineSpacing,
  sanitizedPreviewContent,
  showPageNumbers,
  startPageNumber,
}: ExportPreviewProps) {
  return (
    <div className="flex-1 rounded-panel border border-border/40 bg-app overflow-hidden shadow-panel flex flex-col h-full min-w-0 select-none">
      {/* Top macOS Preview Toolbar & Window Drag Area.
          NOTE: 종이 무대(content layer)는 표준 소재를 쓴다 — liquid glass는 기능
          레이어(사이드바)에만. 툴바도 무대와 같은 톤 위에 헤어라인만 얹는다. */}
      <div
        className="h-10 border-b border-border/30 bg-transparent flex items-center justify-between px-4 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-1.5 text-xs text-muted"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <span className="bg-surface px-2 py-0.5 rounded-control text-fg font-medium text-[11px] shadow-xs">
            100%
          </span>
          <span className="bg-surface px-2 py-0.5 rounded-control text-fg text-[11px] shadow-xs">
            {paperSize}
          </span>
          <span className="text-[11px] font-medium text-muted pl-1.5">
            {t("exportWindow.preview.label")}
          </span>
          {normalizeLineSpacing && (
            <span className="bg-accent/15 px-2 py-0.5 rounded-control text-accent text-[11px] font-medium">
              {t("exportWindow.preview.normalized")}
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas: macOS Preview PDF Sheet */}
      <div
        className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-8 custom-scrollbar bg-transparent"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        {/* Page 1 Sheet — 물리 종이는 theme을 따르지 않는 상수라 --paper-* token(:root
            고정값)으로 못박는다. 테마가 바뀌어도 종이는 순백이어야 한다. */}
        <div
          className="bg-[var(--paper-bg)] text-[var(--paper-text)] shadow-[var(--paper-shadow)] transition-all duration-300 relative shrink-0 rounded-xs"
          style={{
            width: paperSize === "A4" ? "210mm" : paperSize === "Letter" ? "216mm" : "176mm",
            minHeight: paperSize === "A4" ? "297mm" : paperSize === "Letter" ? "279mm" : "250mm",
            paddingTop: `${marginTop}mm`,
            paddingBottom: `${marginBottom}mm`,
            paddingLeft: `${marginLeft}mm`,
            paddingRight: `${marginLeft}mm`,
            marginTop: "6px",
            marginBottom: "24px",
          }}
        >
          <div
            className="w-full h-full whitespace-pre-wrap outline-none select-text font-serif text-[var(--paper-text)]"
            style={{
              fontFamily: fontFamily.includes("Batang") ? "Batang, serif" : fontFamily,
              fontSize: "10.5pt",
              lineHeight,
            }}
          >
            {loadError ? (
              <div className="text-center mt-20">
                <div className="text-danger font-semibold text-sm mb-1.5">{t("exportWindow.preview.errorTitle")}</div>
                <div className="text-[var(--paper-text-muted)] text-xs">{loadError}</div>
              </div>
            ) : chapter ? (
              <>
                <h1 className="text-2xl font-bold text-center mb-10 text-[var(--paper-text)]">
                  {chapter.title}
                </h1>
                <div
                  dangerouslySetInnerHTML={{ __html: sanitizedPreviewContent }}
                  className="tiptap prose max-w-none text-[var(--paper-text)]"
                />
              </>
            ) : (
              <div className="text-center text-[var(--paper-text-muted)] mt-20 text-xs">
                {t("exportWindow.preview.loading")}
              </div>
            )}
          </div>

          {/* Page Number Indicator */}
          {showPageNumbers && (
            <div
              className="absolute bottom-0 left-0 w-full flex items-center justify-center text-[10pt] text-[var(--paper-text-muted)] pointer-events-none"
              style={{
                height: `${marginBottom}mm`,
                fontFamily: fontFamily.includes("Batang") ? "Batang, serif" : fontFamily,
              }}
            >
              - {startPageNumber} -
            </div>
          )}
        </div>

        {/* Page 2 Continuation Shadow Sheet */}
        <div
          className="bg-white/70 shadow-[0_4px_24px_rgba(0,0,0,0.12)] relative shrink-0 opacity-50 pointer-events-none rounded-xs"
          style={{
            width: paperSize === "A4" ? "210mm" : paperSize === "Letter" ? "216mm" : "176mm",
            height: "80mm",
          }}
        >
          {showPageNumbers && (
            <div className="absolute bottom-3 left-0 w-full flex items-center justify-center text-[10pt] text-[var(--paper-text-muted)]">
              - {startPageNumber + 1} -
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
