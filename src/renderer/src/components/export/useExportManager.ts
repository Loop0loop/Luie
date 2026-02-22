import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDialog } from "../common/DialogProvider";
import { api } from "../../services/api";
import { sanitizePreviewHtml } from "../../utils/sanitizeHtml";

export function useExportManager() {
    const { t } = useTranslation();
    const dialog = useDialog();

    const [chapterId] = useState<string | null>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const id = searchParams.get("chapterId");
        if (!id || id === "undefined" || id === "null") {
            return null;
        }
        return id;
    });

    const [chapter, setChapter] = useState<{ title: string; content: string; projectId: string } | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", "dark");

        if (!chapterId) {
            setLoadError(t("exportWindow.error.missingChapterId"));
            return;
        }

        api.chapter.get(chapterId).then((response: any) => {
            if (response.success && response.data) {
                setChapter({
                    title: response.data.title,
                    content: response.data.content || "",
                    projectId: response.data.projectId,
                });
            } else {
                setLoadError(response.error?.message || t("exportWindow.error.loadFailed"));
            }
        }).catch((error: any) => {
            setLoadError(error instanceof Error ? error.message : t("exportWindow.error.unknown"));
        });
    }, [chapterId, t]);

    const [format, setFormat] = useState<"word" | "hwp">("hwp");
    const [paperSize, setPaperSize] = useState("A4");
    const [marginTop, setMarginTop] = useState(20);
    const [marginBottom, setMarginBottom] = useState(15);
    const [marginLeft, setMarginLeft] = useState(20);
    const [lineHeight, setLineHeight] = useState("160%");
    const [fontFamily, setFontFamily] = useState("Batang");

    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [startPageNumber, setStartPageNumber] = useState(1);

    const sanitizedPreviewContent = useMemo(
        () => (chapter?.content ? sanitizePreviewHtml(chapter.content) : ""),
        [chapter?.content],
    );

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
            dialog.toast(t("exportWindow.error.noChapter"), "error");
            return;
        }

        setIsExporting(true);

        try {
            const response = await api.export.create({
                projectId: chapter.projectId,
                chapterId,
                title: chapter.title,
                content: chapter.content,
                format: format === "hwp" ? "HWPX" : "DOCX",
                paperSize: paperSize as "A4" | "Letter" | "B5",
                marginTop,
                marginBottom,
                marginLeft,
                marginRight: marginLeft,
                fontFamily,
                fontSize: 10,
                lineHeight,
                showPageNumbers,
                startPageNumber,
            });

            if (response.success && response.data) {
                const result = response.data as { success: boolean; filePath?: string; error?: string; message?: string };
                if (result.success) {
                    const message = result.message
                        ? result.message
                        : t("exportWindow.alert.success", { path: result.filePath ?? "" });
                    dialog.toast(message, "success", 5000);
                } else {
                    dialog.toast(
                        t("exportWindow.alert.failed", { reason: result.error || "Unknown error" }),
                        "error",
                        5000,
                    );
                }
            } else {
                dialog.toast(
                    t("exportWindow.alert.failed", {
                        reason: response.error?.message || "Unknown error",
                    }),
                    "error",
                    5000,
                );
            }
        } catch (error) {
            void api.logger.error("Export error", {
                error: error instanceof Error ? error.message : String(error),
            });
            dialog.toast(
                t("exportWindow.alert.exception", {
                    reason: error instanceof Error ? error.message : "Unknown error",
                }),
                "error",
                5000,
            );
        } finally {
            setIsExporting(false);
        }
    };

    return {
        t,
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
    };
}
