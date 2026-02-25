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
    sanitizedPreviewContent,
    showPageNumbers,
    startPageNumber,
}: ExportPreviewProps) {
    return (
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
                    className="bg-[#fcfcfc] dark:bg-[#111111] shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300 relative shrink-0 ring-1 ring-border/20 rounded-sm"
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
                        className="w-full h-full text-foreground whitespace-pre-wrap outline-none"
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
                                    dangerouslySetInnerHTML={{ __html: sanitizedPreviewContent }}
                                    className="tiptap"
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
                            className="absolute bottom-0 left-0 w-full flex items-center justify-center text-[10pt] text-foreground/50 pointer-events-none"
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
                    className="bg-[#fcfcfc]/80 dark:bg-[#111111]/80 shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] relative shrink-0 opacity-50 pointer-events-none ring-1 ring-border/20 rounded-sm"
                    style={{
                        width: paperSize === "A4" ? "210mm" : paperSize === "Letter" ? "216mm" : "176mm",
                        height: "100mm", // Just a partial view
                        background: "linear-gradient(to bottom, #ffffff 0%, #e0e0e0 100%)"
                    }}
                >
                    {showPageNumbers && (
                        <div
                            className="absolute bottom-4 left-0 w-full flex items-center justify-center text-[10pt] text-foreground/50"
                        >
                            - {startPageNumber + 1} -
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
