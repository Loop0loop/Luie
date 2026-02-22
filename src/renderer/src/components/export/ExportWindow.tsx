import { useTranslation } from "react-i18next";
import WindowBar from "../layout/WindowBar";
import { useExportManager } from "./useExportManager";
import { ExportSidebar } from "./ExportSidebar";
import { ExportPreview } from "./ExportPreview";

export default function ExportWindow() {
  const { t } = useTranslation();

  const {
    chapter,
    loadError,
    isExporting,
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
    showPageNumbers,
    setShowPageNumbers,
    startPageNumber,
    setStartPageNumber,
    sanitizedPreviewContent,
    expandedSections,
    toggleSection,
    handleExport,
  } = useExportManager();

  return (
    <div className="flex flex-col w-screen h-screen bg-canvas text-fg overflow-hidden select-none font-sans">
      {/* Window Bar */}
      <div className="shrink-0 bg-panel border-b border-border">
        <WindowBar title={t("exportWindow.title")} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Settings Controls */}
        <ExportSidebar
          t={t}
          isExporting={isExporting}
          hasChapter={!!chapter}
          format={format}
          setFormat={setFormat}
          paperSize={paperSize}
          setPaperSize={setPaperSize}
          marginTop={marginTop}
          setMarginTop={setMarginTop}
          marginBottom={marginBottom}
          setMarginBottom={setMarginBottom}
          marginLeft={marginLeft}
          setMarginLeft={setMarginLeft}
          lineHeight={lineHeight}
          setLineHeight={setLineHeight}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          showPageNumbers={showPageNumbers}
          setShowPageNumbers={setShowPageNumbers}
          startPageNumber={startPageNumber}
          setStartPageNumber={setStartPageNumber}
          expandedSections={expandedSections}
          toggleSection={toggleSection}
          handleExport={handleExport}
        />

        {/* Right Panel: Preview Area */}
        <ExportPreview
          t={t}
          chapter={chapter}
          loadError={loadError}
          paperSize={paperSize}
          marginTop={marginTop}
          marginBottom={marginBottom}
          marginLeft={marginLeft}
          fontFamily={fontFamily}
          lineHeight={lineHeight}
          sanitizedPreviewContent={sanitizedPreviewContent}
          showPageNumbers={showPageNumbers}
          startPageNumber={startPageNumber}
        />
      </div>
    </div>
  );
}
