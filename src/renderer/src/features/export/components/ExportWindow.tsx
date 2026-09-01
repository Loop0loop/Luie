import { useTranslation } from "react-i18next";
import { useExportManager } from "@renderer/features/export/hooks/useExportManager";
import { ExportSidebar } from "@renderer/features/export/components/ExportSidebar";
import { ExportPreview } from "@renderer/features/export/components/ExportPreview";

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
    normalizeLineSpacing,
    setNormalizeLineSpacing,
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
    <div className="flex w-screen h-screen bg-sidebar text-fg overflow-hidden select-none font-sans p-2 gap-2">
      {/* NOTE: 두 패널이 rounded-panel로 떠 있고 이 사이·둘레의 프레임은 --bg-sidebar가
             그대로 드러난다. "rounding으로 남는 공간을 sidebar 색으로 채운다"는 표면
             규칙이라 프레임 색을 바꿀 때는 ExportSidebar·ExportPreview의 표면과 함께
             봐야 한다. */}
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
        normalizeLineSpacing={normalizeLineSpacing}
        setNormalizeLineSpacing={setNormalizeLineSpacing}
        showPageNumbers={showPageNumbers}
        setShowPageNumbers={setShowPageNumbers}
        startPageNumber={startPageNumber}
        setStartPageNumber={setStartPageNumber}
        expandedSections={expandedSections}
        toggleSection={toggleSection}
        handleExport={handleExport}
      />

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
        normalizeLineSpacing={normalizeLineSpacing}
        sanitizedPreviewContent={sanitizedPreviewContent}
        showPageNumbers={showPageNumbers}
        startPageNumber={startPageNumber}
      />
    </div>
  );
}
