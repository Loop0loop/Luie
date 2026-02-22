import { useCallback } from "react";
import type { DragData } from "../components/common/GlobalDragContext";
import type { EditorUiMode } from "../../../shared/types";

// UI Store actions expected
interface DropHandlerDependencies {
    uiMode: EditorUiMode;
    handleSelectChapter: (id: string) => void;
    handleSelectResearchItem: (type: "character" | "world" | "scrap" | "analysis") => void;
    setMainView: (view: any) => void;
    setWorldTab: (tab: any) => void;
    addPanel: (panelInfo: any, insertAt?: number) => void;
}

export function useWorkspaceDropHandlers({
    uiMode,
    handleSelectChapter,
    handleSelectResearchItem,
    setMainView,
    setWorldTab,
    addPanel,
}: DropHandlerDependencies) {

    const handleDropToCenter = useCallback((data: DragData) => {
        if (data.type === "chapter") {
            handleSelectChapter(data.id);
            return;
        }

        if (uiMode === "scrivener") {
            switch (data.type) {
                case "character":
                    setMainView({ type: "character", id: data.id });
                    break;
                case "world":
                    setWorldTab("terms");
                    setMainView({ type: "world", id: data.id });
                    break;
                case "mindmap":
                    setWorldTab("mindmap");
                    setMainView({ type: "world", id: data.id });
                    break;
                case "plot":
                    setWorldTab("plot");
                    setMainView({ type: "world", id: data.id });
                    break;
                case "drawing":
                    setWorldTab("drawing");
                    setMainView({ type: "world", id: data.id });
                    break;
                case "synopsis":
                    setWorldTab("synopsis");
                    setMainView({ type: "world", id: data.id });
                    break;
                case "memo":
                    setMainView({ type: "memo", id: data.id });
                    break;
                case "analysis":
                    setMainView({ type: "analysis", id: data.id });
                    break;
                case "trash":
                    setMainView({ type: "trash", id: data.id });
                    break;
            }
        } else {
            switch (data.type) {
                case "character":
                    handleSelectResearchItem("character");
                    break;
                case "world":
                case "mindmap":
                case "plot":
                case "drawing":
                case "synopsis":
                    handleSelectResearchItem("world");
                    break;
                case "memo":
                    handleSelectResearchItem("scrap");
                    break;
                case "analysis":
                    handleSelectResearchItem("analysis");
                    break;
            }
        }
    }, [uiMode, handleSelectChapter, handleSelectResearchItem, setMainView, setWorldTab]);

    const handleDropToSplit = useCallback((data: DragData, side?: "left" | "right" | "bottom") => {
        let insertAt: number | undefined;
        if (side === "left") insertAt = 0;

        switch (data.type) {
            case "chapter":
                addPanel({ type: "editor", id: data.id }, insertAt);
                break;
            case "character":
                addPanel({ type: "research", tab: "character", id: data.id }, insertAt);
                break;
            case "world":
            case "mindmap":
            case "plot":
            case "drawing":
            case "synopsis":
                addPanel({ type: "research", tab: "world", id: data.id }, insertAt);
                break;
            case "memo":
                addPanel({ type: "research", tab: "scrap", id: data.id }, insertAt);
                break;
            case "analysis":
                addPanel({ type: "research", tab: "analysis", id: data.id }, insertAt);
                break;
        }
    }, [addPanel]);

    return {
        handleDropToCenter,
        handleDropToSplit,
    };
}
