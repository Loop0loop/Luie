import { useState, lazy, Suspense, useCallback, useMemo } from "react";
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
import { emitShortcutCommand } from "../../hooks/useShortcutCommand";
import { useDialog } from "../common/DialogProvider";
import { api } from "../../services/api";
import { openDocsRightTab as openDocsPanelTab } from "../../services/docsPanelService";
import { createLayoutModeActions } from "../../services/layoutModeActions";
import { GlobalDragContext } from "../common/GlobalDragContext";
import { useEditorRootShortcuts } from "./useEditorRootShortcuts";

const SettingsModal = lazy(() => import("../settings/SettingsModal"));
import { WorkspacePanels } from "./WorkspacePanels";

export default function EditorRoot() {
    const { t } = useTranslation();
    const dialog = useDialog();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                onOpenSidebarSectionLegacy: (section: any) =>
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

    useEditorRootShortcuts({
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
    });

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

    const sharedEditor = (
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
            scrollable={uiMode === "scrivener" || uiMode === "default"}
            onEditorReady={setDocEditor}
        />
    );

    const additionalPanelsComponent = (
        <WorkspacePanels
            panels={panels}
            removePanel={removePanel}
            chapters={chapters}
            currentProjectId={currentProject?.id}
            activeChapterId={activeChapterId ?? undefined}
            activeChapterTitle={activeChapterTitle}
            onSave={handleSave}
        />
    );

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
                    {sharedEditor}
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
                    {sharedEditor}
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
                    {sharedEditor}
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
                    {sharedEditor}
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
