import { useTranslation } from "react-i18next";
import { Download, FileText, Layout, Type, AlignJustify, Info, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../../../../shared/types/utils";

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

interface ExportSidebarProps {
    t: ReturnType<typeof useTranslation>["t"];
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
    showPageNumbers,
    setShowPageNumbers,
    startPageNumber,
    setStartPageNumber,
    expandedSections,
    toggleSection,
    handleExport,
}: ExportSidebarProps) {
    return (
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
                    disabled={isExporting || !hasChapter}
                    className="w-full h-11 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-5 h-5" />
                    {isExporting ? t("exportWindow.button.exporting") : t("exportWindow.button.export", { format: format.toUpperCase() })}
                </button>
            </div>
        </div>
    );
}
