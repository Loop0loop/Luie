import { useCallback, useEffect, useRef, useMemo } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { useShortcuts } from "@renderer/features/workspace/hooks/useShortcuts";
import { emitShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import {
    EDITOR_TOOLBAR_FONT_MIN,
    EDITOR_TOOLBAR_FONT_STEP,
} from "@renderer/shared/constants/editorLayout";
import type { createLayoutModeActions } from "@renderer/features/workspace/services/layoutModeActions";
import type { WorldTab } from "@renderer/features/workspace/stores/uiStore";
import { saveProjectNow } from "@renderer/features/workspace/services/saveCoordinator";
import { useToast } from "@shared/ui/ToastContext";

interface UseEditorRootShortcutsProps {
    setIsSettingsOpen: (open: boolean) => void;
    handleAddChapter: () => void;
    currentProjectId: string | null;
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
    /** 선택 영역이 있으면 그 구간에만 크기를 적용하기 위해 필요하다. */
    editor: TiptapEditor | null;
}

export function useEditorRootShortcuts({
    setIsSettingsOpen,
    handleAddChapter,
    currentProjectId,
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
    editor,
}: UseEditorRootShortcutsProps) {
    const { showToast } = useToast();
    const { t } = useTranslation();
    const chapterChordRef = useRef<{ digits: string; timerId?: number }>({
        digits: "",
    });
    const closeFocusedSurface = useUIStore((state) => state.closeFocusedSurface);

    useEffect(() => {
        const CHAPTER_CHORD_TIMEOUT_MS = 700;

        /**
         * Cmd/Ctrl + 숫자로 원고를 연다. 두 자리 이상(예: 12번)을 받기 위해 입력을 누적한다.
         *
         * WHY 즉시 이동하는가: 이전에는 누적이 끝날 때까지 700ms를 기다린 뒤에야 이동했다.
         * 한 자리 입력이 대부분인데 매번 0.7초가 비어서 단축키가 동작하지 않는 것처럼 보였다.
         * 이제 누른 즉시 현재까지 누적된 번호로 이동하고, 창 안에 다음 숫자가 오면 그 숫자를
         * 붙인 번호로 다시 이동한다.
         *
         * WARNING: 이 리스너는 capture 단계에서 `stopImmediatePropagation()`을 호출해
         * `useShortcuts`의 `chapter.open.*` 항목이 발화하지 못하게 막는다. 두 구현이 같은
         * 키를 다투면 이동이 두 번 일어나므로, 숫자 조합은 이 핸들러가 단독으로 담당한다.
         */
        const handleChapterChord = (event: KeyboardEvent) => {
            const isModifierPressed = event.metaKey || event.ctrlKey;
            if (!isModifierPressed) return;

            if (!/^[0-9]$/.test(event.key)) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            chapterChordRef.current.digits += event.key;
            const digits = chapterChordRef.current.digits;

            if (chapterChordRef.current.timerId) {
                window.clearTimeout(chapterChordRef.current.timerId);
            }

            // 누적 창을 닫는 타이머. 이동 자체는 아래에서 이미 수행한다.
            chapterChordRef.current.timerId = window.setTimeout(() => {
                chapterChordRef.current.digits = "";
                chapterChordRef.current.timerId = undefined;
            }, CHAPTER_CHORD_TIMEOUT_MS);

            const chapterNumber = digits === "0" ? 10 : Number.parseInt(digits, 10);
            if (!Number.isFinite(chapterNumber) || chapterNumber <= 0) return;

            openChapterByIndex(chapterNumber - 1);
        };

        window.addEventListener("keydown", handleChapterChord, true);
        return () => window.removeEventListener("keydown", handleChapterChord, true);
    }, [openChapterByIndex]);

    /**
     * 폰트 크기 적용.
     *
     * 선택 영역이 있으면 그 구간에만 `textStyle` mark로 적용하고, 없으면 전역 설정을 바꾼다.
     * 툴바의 크기 드롭다운과 같은 규칙이다.
     *
     * WHY 전역까지 바꾸지 않는가: 일부 문장만 키우려던 조작이 문서 기본 크기를 바꾸면
     * 되돌리기 어렵다.
     */
    const applyFontSize = useCallback(
        (nextSize: number) => {
            const selection = editor?.state.selection;
            if (editor && selection && !selection.empty) {
                editor.chain().focus().setFontSize(`${nextSize}px`).run();
                return;
            }
            void setFontSize(nextSize);
        },
        [editor, setFontSize],
    );

    const shortcutHandlers = useMemo(
        () => ({
            "app.openSettings": () => setIsSettingsOpen(true),
            "app.closeWindow": () => {
                const closedSurface = closeFocusedSurface();
                if (!closedSurface) {
                    void api.window.close();
                }
            },
            "app.quit": () => void api.app.quit(),
            "chapter.new": () => void handleAddChapter(),
            "chapter.save": async () => {
                if (!currentProjectId) return;
                try {
                    await saveProjectNow(currentProjectId);
                    // WHY 성공 토스트가 필요한가: 수동 저장은 화면에 아무 변화를 만들지 않는다.
                    // 피드백이 없으면 사용자는 단축키가 동작하지 않았다고 판단한다.
                    showToast(t("editor.status.saved"), "success");
                } catch (error) {
                    void api.logger.error("Manual project save failed", { error });
                    showToast(t("editor.status.error"), "error");
                }
            },
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
            "sidebar.section.snapshot.open": () => layoutModeActions.toggleSidebarSection("snapshot"),
            "sidebar.section.trash.open": () => layoutModeActions.toggleSidebarSection("trash"),
            "project.rename": () => void handleRenameProject(),
            "research.open.character": () => layoutModeActions.toggleResearchTab("character"),
            "research.open.world": () => layoutModeActions.toggleResearchTab("world"),
            "research.open.scrap": () => layoutModeActions.toggleResearchTab("scrap"),
            "research.open.analysis": () => layoutModeActions.toggleResearchTab("analysis"),
            "research.open.character.left": () => layoutModeActions.toggleResearchTab("character"),
            "research.open.world.left": () => layoutModeActions.toggleResearchTab("world"),
            "research.open.scrap.left": () => layoutModeActions.toggleResearchTab("scrap"),
            "research.open.analysis.left": () => layoutModeActions.toggleResearchTab("analysis"),
            "character.openTemplate": () => emitShortcutCommand({ type: "character.openTemplate" }),
            "world.tab.synopsis": () => setWorldTab("synopsis"),
            "world.tab.terms": () => setWorldTab("terms"),
            "world.tab.mindmap": () => setWorldTab("mindmap"),
            "world.tab.drawing": () => setWorldTab("drawing"),
            "world.tab.plot": () => setWorldTab("plot"),
            "world.tab.graph": () => {
                layoutModeActions.openResearchTab("world");
                setWorldTab("graph");
            },
            "world.addTerm": () => emitShortcutCommand({ type: "world.addTerm" }),
            "scrap.addMemo": () => emitShortcutCommand({ type: "scrap.addMemo" }),
            "export.openPreview": () => handleQuickExport(),
            "export.openWindow": () => handleQuickExport(),
            "editor.openRight": () => layoutModeActions.openEditorInSplit(),
            "editor.openLeft": () => layoutModeActions.openEditorInSplit(),
            "editor.fontSize.increase": () => applyFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP),
            "editor.fontSize.decrease": () =>
                applyFontSize(Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP)),
            "window.toggleFullscreen": () => void api.window.toggleFullscreen(),
        }),
        [
            handleAddChapter,
            currentProjectId,
            handleDeleteActiveChapter,
            closeFocusedSurface,
            isSidebarOpen,
            openChapterByIndex,
            handleRenameProject,
            layoutModeActions,
            handleQuickExport,
            setWorldTab,
            applyFontSize,
            fontSize,
            setSidebarOpen,
            setIsSettingsOpen,
            showToast,
            t,
        ],
    );

    useShortcuts(shortcutHandlers);
}
