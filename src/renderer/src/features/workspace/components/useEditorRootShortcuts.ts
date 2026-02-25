import { useEffect, useRef, useMemo } from "react";
import { useShortcuts } from "@renderer/features/workspace/hooks/useShortcuts";
import { emitShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import {
    EDITOR_TOOLBAR_FONT_MIN,
    EDITOR_TOOLBAR_FONT_STEP,
} from "@shared/constants/configs";
import type { createLayoutModeActions } from "@renderer/features/workspace/services/layoutModeActions";
import type { EditorUiMode } from "@shared/types";
import type { WorldTab } from "@renderer/features/workspace/stores/uiStore";

interface UseEditorRootShortcutsProps {
    setIsSettingsOpen: (open: boolean) => void;
    handleAddChapter: () => void;
    handleSave: (title: string, content: string) => void;
    handleDeleteActiveChapter: () => void;
    openChapterByIndex: (index: number) => void;
    handleRenameProject: () => Promise<void>;
    handleQuickExport: () => void;
    setSidebarOpen: (open: boolean) => void;
    isSidebarOpen: boolean;
    layoutModeActions: ReturnType<typeof createLayoutModeActions>;
    setWorldTab: (tab: WorldTab) => void;
    setFontSize: (size: number) => void;
    fontSize: number;
    setUiMode: (mode: EditorUiMode) => void;
    uiMode: EditorUiMode;
    activeChapterTitle: string;
    content: string;
}

export function useEditorRootShortcuts({
    setIsSettingsOpen,
    handleAddChapter,
    handleSave,
    handleDeleteActiveChapter,
    openChapterByIndex,
    handleRenameProject,
    handleQuickExport,
    setSidebarOpen,
    isSidebarOpen,
    layoutModeActions,
    setWorldTab,
    setFontSize,
    fontSize,
    setUiMode,
    uiMode,
    activeChapterTitle,
    content,
}: UseEditorRootShortcutsProps) {
    const chapterChordRef = useRef<{ digits: string; timerId?: number }>({
        digits: "",
    });

    useEffect(() => {
        const CHAPTER_CHORD_TIMEOUT_MS = 700;

        const handleChapterChord = (event: KeyboardEvent) => {
            const isModifierPressed = event.metaKey || event.ctrlKey;
            if (!isModifierPressed) return;

            if (!/^[0-9]$/.test(event.key)) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            chapterChordRef.current.digits += event.key;

            if (chapterChordRef.current.timerId) {
                window.clearTimeout(chapterChordRef.current.timerId);
            }

            chapterChordRef.current.timerId = window.setTimeout(() => {
                const digits = chapterChordRef.current.digits;
                chapterChordRef.current.digits = "";
                chapterChordRef.current.timerId = undefined;

                const chapterNumber = digits === "0" ? 10 : Number.parseInt(digits, 10);
                if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) return;

                openChapterByIndex(chapterNumber - 1);
            }, CHAPTER_CHORD_TIMEOUT_MS);
        };

        window.addEventListener("keydown", handleChapterChord, true);
        return () => window.removeEventListener("keydown", handleChapterChord, true);
    }, [openChapterByIndex]);

    const shortcutHandlers = useMemo(
        () => ({
            "app.openSettings": () => setIsSettingsOpen(true),
            "app.closeWindow": () => {
                const closedSurface = useUIStore.getState().closeFocusedSurface();
                if (!closedSurface) {
                    void api.window.close();
                }
            },
            "app.quit": () => void api.app.quit(),
            "chapter.new": () => void handleAddChapter(),
            "chapter.save": () => void handleSave(activeChapterTitle, content),
            "chapter.delete": () => void handleDeleteActiveChapter(),
            "chapter.open.1": () => openChapterByIndex(0),
            "chapter.open.2": () => openChapterByIndex(1),
            "chapter.open.3": () => openChapterByIndex(2),
            "chapter.open.4": () => openChapterByIndex(3),
            "chapter.open.5": () => openChapterByIndex(4),
            "chapter.open.6": () => openChapterByIndex(5),
            "chapter.open.7": () => openChapterByIndex(6),
            "chapter.open.8": () => openChapterByIndex(7),
            "chapter.open.9": () => openChapterByIndex(8),
            "chapter.open.0": () => openChapterByIndex(9),
            "view.toggleSidebar": () => setSidebarOpen(!isSidebarOpen),
            "view.sidebar.open": () => setSidebarOpen(true),
            "view.sidebar.close": () => setSidebarOpen(false),
            "view.toggleContextPanel": () => layoutModeActions.toggleContextPanel(),
            "view.context.open": () => layoutModeActions.openContextPanel(),
            "view.context.close": () => layoutModeActions.closeContextPanel(),
            "sidebar.section.manuscript.toggle": () => layoutModeActions.toggleManuscriptPanel(),
            "sidebar.section.snapshot.open": () => layoutModeActions.openSidebarSection("snapshot"),
            "sidebar.section.trash.open": () => layoutModeActions.openSidebarSection("trash"),
            "project.rename": () => void handleRenameProject(),
            "research.open.character": () => layoutModeActions.openResearchTab("character"),
            "research.open.world": () => layoutModeActions.openResearchTab("world"),
            "research.open.scrap": () => layoutModeActions.openResearchTab("scrap"),
            "research.open.analysis": () => layoutModeActions.openResearchTab("analysis"),
            "research.open.character.left": () => layoutModeActions.openResearchTab("character"),
            "research.open.world.left": () => layoutModeActions.openResearchTab("world"),
            "research.open.scrap.left": () => layoutModeActions.openResearchTab("scrap"),
            "research.open.analysis.left": () => layoutModeActions.openResearchTab("analysis"),
            "character.openTemplate": () => emitShortcutCommand({ type: "character.openTemplate" }),
            "world.tab.synopsis": () => setWorldTab("synopsis"),
            "world.tab.terms": () => setWorldTab("terms"),
            "world.tab.mindmap": () => setWorldTab("mindmap"),
            "world.tab.drawing": () => setWorldTab("drawing"),
            "world.tab.plot": () => setWorldTab("plot"),
            "world.addTerm": () => emitShortcutCommand({ type: "world.addTerm" }),
            "scrap.addMemo": () => emitShortcutCommand({ type: "scrap.addMemo" }),
            "export.openPreview": () => handleQuickExport(),
            "export.openWindow": () => handleQuickExport(),
            "editor.openRight": () => layoutModeActions.openEditorInSplit(),
            "editor.openLeft": () => layoutModeActions.openEditorInSplit(),
            "editor.fontSize.increase": () => void setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP),
            "editor.fontSize.decrease": () => void setFontSize(Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP)),
            "window.toggleFullscreen": () => void api.window.toggleFullscreen(),
            "view.toggleFocusMode": () => void setUiMode(uiMode === "focus" ? "default" : "focus"),
        }),
        [
            activeChapterTitle,
            content,
            handleAddChapter,
            handleSave,
            handleDeleteActiveChapter,
            isSidebarOpen,
            openChapterByIndex,
            handleRenameProject,
            layoutModeActions,
            handleQuickExport,
            setWorldTab,
            setFontSize,
            fontSize,
            setSidebarOpen,
            uiMode,
            setUiMode,
            setIsSettingsOpen,
        ],
    );

    useShortcuts(shortcutHandlers);
}
