import { useState, lazy, Suspense, useCallback, useEffect, useMemo, useRef, Fragment } from "react";
import { type Editor as TiptapEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import MainLayout from "./MainLayout";
import GoogleDocsLayout from "./GoogleDocsLayout";
import FocusLayout from "./FocusLayout";
import EditorLayout from "./EditorLayout";
import Sidebar from "../sidebar/Sidebar";
import DocsSidebar from "../sidebar/DocsSidebar";
import Editor from "../editor/Editor";
import { SmartLinkTooltip } from "../editor/SmartLinkTooltip";
import ContextPanel from "../context/ContextPanel";
import ScrivenerLayout from "./ScrivenerLayout";
import ScrivenerSidebar from "../sidebar/ScrivenerSidebar";

import { useProjectStore } from "../../stores/projectStore";
import { useUIStore, type DocsRightTab } from "../../stores/uiStore";
import { useEditorStore } from "../../stores/editorStore";
import { useChapterManagement } from "../../hooks/useChapterManagement";
import { useSplitView } from "../../hooks/useSplitView";
import { useWorkspaceDropHandlers } from "../../hooks/useWorkspaceDropHandlers";
import { useShortcuts } from "../../hooks/useShortcuts";
import { emitShortcutCommand } from "../../hooks/useShortcutCommand";
import { useDialog } from "../common/DialogProvider";
import {
    EDITOR_TOOLBAR_FONT_MIN,
    EDITOR_TOOLBAR_FONT_STEP,
} from "../../../../shared/constants/configs";
import { api } from "../../services/api";
import { openDocsRightTab as openDocsPanelTab } from "../../services/docsPanelService";
import { createLayoutModeActions } from "../../services/layoutModeActions";
import { GlobalDragContext } from "../common/GlobalDragContext";
import { Panel, Separator as PanelResizeHandle } from "react-resizable-panels";

const SettingsModal = lazy(() => import("../settings/SettingsModal"));
const ResearchPanel = lazy(() => import("../research/ResearchPanel"));
const SnapshotViewer = lazy(() => import("../snapshot/SnapshotViewer"));
const ExportPreviewPanel = lazy(() => import("../export/ExportPreviewPanel"));

export default function EditorRoot() {
    const { t } = useTranslation();
    const dialog = useDialog();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const chapterChordRef = useRef<{ digits: string; timerId?: number }>({
        digits: "",
    });

    const uiMode = useEditorStore((state) => state.uiMode);
    const setUiMode = useEditorStore((state) => state.setUiMode);
    const fontSize = useEditorStore((state) => state.fontSize);
    const setFontSize = useEditorStore((state) => state.setFontSize);

    const wordCount = useEditorStore((state) => state.wordCount);
    const isDocsMode = uiMode === "docs";

    const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
    const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
    const setContextOpen = useUIStore((state) => state.setContextOpen);
    const setWorldTab = useUIStore((state) => state.setWorldTab);
    const docsRightTab = useUIStore((state) => state.docsRightTab);
    const setDocsRightTab = useUIStore((state) => state.setDocsRightTab);
    const isManuscriptMenuOpen = useUIStore((state) => state.isManuscriptMenuOpen);

    const currentProject = useProjectStore((state) => state.currentProject);
    const updateProject = useProjectStore((state) => state.updateProject);

    const {
        chapters,
        activeChapterId,
        content,
        activeChapterTitle,
        handleSelectChapter,
        handleAddChapter,
        handleRenameChapter,
        handleDeleteChapter,
        handleSave,
    } = useChapterManagement();

    const activeChapter = useMemo(() =>
        chapters.find((c) => c.id === activeChapterId),
        [chapters, activeChapterId]
    );

    const [docEditor, setDocEditor] = useState<TiptapEditor | null>(null);

    const openChapterByIndex = useCallback(
        (index: number) => {
            if (index < 0 || index >= chapters.length) return;
            const target = chapters[index];
            if (target?.id) {
                handleSelectChapter(target.id);
            }
        },
        [chapters, handleSelectChapter],
    );

    const handleDeleteActiveChapter = useCallback(async () => {
        if (!isManuscriptMenuOpen) return;
        if (!activeChapterId) return;
        const confirmed = await dialog.confirm({
            title: t("sidebar.menu.delete"),
            message: t("bootstrap.deleteManuscriptConfirm"),
            isDestructive: true,
        });
        if (!confirmed) return;
        await handleDeleteChapter(activeChapterId);
    }, [activeChapterId, dialog, handleDeleteChapter, isManuscriptMenuOpen, t]);

    const {
        panels,
        contextTab,
        setContextTab,
        addPanel,
        removePanel,
        handleSelectResearchItem,
        handleSplitView,
        handleOpenExport,
    } = useSplitView();

    const { setMainView } = useUIStore();

    const { handleDropToCenter, handleDropToSplit } = useWorkspaceDropHandlers({
        uiMode,
        handleSelectChapter,
        handleSelectResearchItem,
        setMainView,
        setWorldTab,
        addPanel,
    });

    const openDocsRightTab = useCallback((tab: Exclude<DocsRightTab, null>) => {
        openDocsPanelTab(tab);
    }, []);

    const layoutModeActions = useMemo(
        () =>
            createLayoutModeActions({
                isDocsMode,
                isSidebarOpen,
                docsRightTab,
                activeChapterId: activeChapterId ?? null,
                openDocsRightTab,
                setDocsRightTab,
                setContextOpen,
                setSidebarOpen,
                addPanel,
                handleSelectResearchItem,
                handleOpenExport,
                onToggleManuscriptLegacy: () =>
                    emitShortcutCommand({ type: "sidebar.section.toggle", section: "manuscript" }),
                onOpenSidebarSectionLegacy: (section) =>
                    emitShortcutCommand({ type: "sidebar.section.open", section }),
            }),
        [
            activeChapterId,
            docsRightTab,
            isDocsMode,
            isSidebarOpen,
            openDocsRightTab,
            setDocsRightTab,
            setContextOpen,
            setSidebarOpen,
            addPanel,
            handleSelectResearchItem,
            handleOpenExport,
        ],
    );

    const handleQuickExport = useCallback(() => {
        if (!activeChapterId) return;
        void api.window.openExport(activeChapterId);
    }, [activeChapterId]);

    const handleRenameProject = useCallback(async () => {
        if (!currentProject?.id) return;

        const nextTitle = (
            await dialog.prompt({
                title: t("sidebar.tooltip.renameProject"),
                message: t("sidebar.prompt.renameProject"),
                defaultValue: currentProject.title ?? "",
                placeholder: t("sidebar.prompt.renameProject"),
            })
        )?.trim();

        if (!nextTitle || nextTitle === currentProject.title) return;
        await updateProject(currentProject.id, nextTitle);
    }, [currentProject, dialog, t, updateProject]);

    const shortcutHandlers = useMemo(
        () => ({
            "app.openSettings": () => setIsSettingsOpen(true),
            "app.closeWindow": () => void api.window.close(),
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
            "export.openPreview": () => layoutModeActions.openExportPreview(),
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
        ],
    );

    useShortcuts(shortcutHandlers);

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

    const prefetchSettings = useCallback(() => {
        void import("../settings/SettingsModal");
    }, []);

    if (uiMode === "focus") {
        return (
            <>
                <FocusLayout activeChapterTitle={activeChapterTitle} wordCount={wordCount}>
                    <Editor
                        key={activeChapterId ?? "focus-editor"}
                        chapterId={activeChapterId ?? undefined}
                        initialTitle={activeChapterTitle}
                        initialContent={content}
                        onSave={handleSave}
                        focusMode={true}
                        hideToolbar={true}
                        hideFooter={true}
                        hideTitle={true}
                        scrollable={true}
                    />
                </FocusLayout>
                <SmartLinkTooltip />
            </>
        );
    }

    const editorContent = (
        <Editor
            key={activeChapterId ?? "main-editor"}
            chapterId={activeChapterId ?? undefined}
            initialTitle={activeChapterTitle}
            initialContent={content}
            onSave={handleSave}
        />
    );

    const additionalPanelsComponent = panels.map((panel) => (
        <Fragment key={panel.id}>
            <PanelResizeHandle className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-50 relative" />
            <Panel defaultSize={panel.size} minSize={20} className="min-w-0 bg-panel relative flex flex-col">
                <div className="flex justify-between items-center p-2 border-b border-border bg-surface text-xs font-semibold text-muted">
                    <span className="uppercase">{panel.content.type}</span>
                    <button onClick={() => removePanel(panel.id)} className="hover:bg-surface-hover rounded p-1">✕</button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <Suspense fallback={<div style={{ padding: 20 }}>{t("common.loading")}</div>}>
                        {panel.content.type === "research" ? (
                            <ResearchPanel
                                activeTab={panel.content.tab || "character"}
                                onClose={() => removePanel(panel.id)}
                            />
                        ) : panel.content.type === "snapshot" && panel.content.snapshot ? (
                            <SnapshotViewer
                                snapshot={panel.content.snapshot}
                                currentContent={
                                    chapters.find(
                                        (c) =>
                                            c.projectId === currentProject?.id &&
                                            c.id === panel.content.snapshot?.chapterId,
                                    )?.content || ""}
                                onApplySnapshotText={async (nextContent) => {
                                    if (!activeChapterId) return;
                                    await handleSave(activeChapterTitle, nextContent);
                                }}
                            />
                        ) : panel.content.type === "export" ? (
                            <ExportPreviewPanel title={activeChapterTitle} />
                        ) : (
                            <div
                                style={{
                                    height: "100%",
                                    overflow: "hidden",
                                    background: "var(--bg-primary)",
                                }}
                            >
                                <Editor
                                    initialTitle={
                                        chapters.find((c) => c.id === panel.content.id)?.title
                                    }
                                    initialContent=""
                                    readOnly={true}
                                />
                            </div>
                        )}
                    </Suspense>
                </div>
            </Panel>
        </Fragment>
    ));

    return (
        <GlobalDragContext onDropToCenter={handleDropToCenter} onDropToSplit={handleDropToSplit}>
            {uiMode === 'docs' ? (
                <GoogleDocsLayout
                    sidebar={
                        <DocsSidebar />
                    }
                    activeChapterId={activeChapterId ?? undefined}
                    activeChapterTitle={activeChapterTitle}
                    activeChapterContent={content}
                    currentProjectId={currentProject?.id}
                    editor={docEditor}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onRenameChapter={handleRenameChapter}
                    onSaveChapter={handleSave}
                    additionalPanels={additionalPanelsComponent}
                >
                    <Editor
                        key={activeChapterId}
                        initialTitle={activeChapter ? activeChapter.title : ""}
                        initialContent={activeChapter ? activeChapter.content : ""}
                        onSave={handleSave}
                        readOnly={!activeChapterId}
                        chapterId={activeChapterId || undefined}
                        hideToolbar={true}
                        hideFooter={true}
                        hideTitle={true}
                        scrollable={false}
                        onEditorReady={setDocEditor}
                    />
                </GoogleDocsLayout>
            ) : uiMode === "editor" ? (
                <EditorLayout
                    sidebar={
                        <DocsSidebar />
                    }
                    activeChapterId={activeChapterId ?? undefined}
                    activeChapterTitle={activeChapterTitle}
                    currentProjectId={currentProject?.id}
                    editor={docEditor}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onRenameChapter={handleRenameChapter}
                    onSaveChapter={handleSave}
                    additionalPanels={additionalPanelsComponent}
                >
                    <Editor
                        key={activeChapterId}
                        initialTitle={activeChapter ? activeChapter.title : ""}
                        initialContent={activeChapter ? activeChapter.content : ""}
                        onSave={handleSave}
                        readOnly={!activeChapterId}
                        chapterId={activeChapterId || undefined}
                        hideToolbar={true}
                        hideFooter={true}
                        hideTitle={true}
                        scrollable={false}
                        onEditorReady={setDocEditor}
                    />
                </EditorLayout>
            ) : uiMode === "scrivener" ? (
                <ScrivenerLayout
                    sidebar={
                        <ScrivenerSidebar />
                    }
                    activeChapterId={activeChapterId ?? undefined}
                    activeChapterTitle={activeChapterTitle}
                    editor={docEditor}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    additionalPanels={additionalPanelsComponent}
                >
                    <Editor
                        key={activeChapterId}
                        initialTitle={activeChapter ? activeChapter.title : ""}
                        initialContent={activeChapter ? activeChapter.content : ""}
                        onSave={handleSave}
                        readOnly={!activeChapterId}
                        chapterId={activeChapterId || undefined}
                        hideToolbar={true}
                        hideFooter={true}
                        hideTitle={true}
                        scrollable={true}
                        onEditorReady={setDocEditor}
                    />
                </ScrivenerLayout>
            ) : (
                <MainLayout
                    sidebar={
                        <Sidebar
                            onOpenSettings={() => setIsSettingsOpen(true)}
                            onPrefetchSettings={prefetchSettings}
                            onSelectResearchItem={handleSelectResearchItem}
                            onSplitView={handleSplitView}
                        />
                    }
                    contextPanel={
                        <ContextPanel activeTab={contextTab} onTabChange={setContextTab} />
                    }
                    additionalPanels={additionalPanelsComponent}
                >
                    {editorContent}
                </MainLayout>
            )}

            {isSettingsOpen && (
                <Suspense fallback={null}>
                    <SettingsModal onClose={() => setIsSettingsOpen(false)} />
                </Suspense>
            )}
            <SmartLinkTooltip isSettingsOpen={isSettingsOpen} />
        </GlobalDragContext>
    );
}
