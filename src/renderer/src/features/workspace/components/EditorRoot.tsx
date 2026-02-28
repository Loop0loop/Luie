import { useState, lazy, Suspense, useCallback, useMemo, useEffect } from "react";
import { type Editor as TiptapEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import MainLayout from "@renderer/features/workspace/components/MainLayout";
import GoogleDocsLayout from "@renderer/features/workspace/components/GoogleDocsLayout";
import FocusLayout from "@renderer/features/workspace/components/FocusLayout";
import EditorLayout from "@renderer/features/workspace/components/EditorLayout";
import Sidebar from "@renderer/features/manuscript/components/Sidebar";
import DocsSidebar from "@renderer/features/manuscript/components/DocsSidebar";
import Editor from "@renderer/features/editor/components/Editor";
import { SmartLinkTooltip } from "@renderer/features/editor/components/SmartLinkTooltip";
import ContextPanel from "@renderer/features/workspace/components/ContextPanel";
import ScrivenerLayout from "@renderer/features/workspace/components/ScrivenerLayout";
import ScrivenerSidebar from "@renderer/features/manuscript/components/ScrivenerSidebar";

import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useUIStore, type DocsRightTab } from "@renderer/features/workspace/stores/uiStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";
import { useChapterManagement } from "@renderer/features/manuscript/hooks/useChapterManagement";
import { useSplitView } from "@renderer/features/workspace/hooks/useSplitView";
import { useWorkspaceDropHandlers } from "@renderer/features/workspace/hooks/useWorkspaceDropHandlers";
import { emitShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { useDialog } from "@shared/ui/useDialog";
import { openDocsRightTab as openDocsPanelTab } from "@renderer/features/workspace/services/docsPanelService";
import { createLayoutModeActions } from "@renderer/features/workspace/services/layoutModeActions";
import { openQuickExportEntry } from "@renderer/features/workspace/services/exportEntryService";
import { GlobalDragContext } from "@shared/ui/GlobalDragContext";
import { useEditorRootShortcuts } from "@renderer/features/workspace/components/useEditorRootShortcuts";
import { FeatureErrorBoundary } from "@shared/ui/FeatureErrorBoundary";

const SettingsModal = lazy(() => import("@renderer/features/settings/components/SettingsModal"));
import { WorkspacePanels } from "@renderer/features/workspace/components/WorkspacePanels";

export default function EditorRoot() {
    const { t } = useTranslation();
    const dialog = useDialog();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const uiMode = useEditorStore((state) => state.uiMode);
    const setUiMode = useEditorStore((state) => state.setUiMode);
    const fontSize = useEditorStore((state) => state.fontSize);
    const setFontSize = useEditorStore((state) => state.setFontSize);

    const wordCount = useEditorStatsStore((state) => state.wordCount);
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

    const { setMainView } = useUIStore();

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

    const handleSelectChapterWithView = useCallback((id: string) => {
        handleSelectChapter(id);
    }, [handleSelectChapter]);

    const { handleDropToCenter, handleDropToSplit } = useWorkspaceDropHandlers({
        uiMode,
        handleSelectChapter: handleSelectChapterWithView,
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
                onOpenSidebarSectionLegacy: (section: "snapshot" | "trash") =>
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
        void openQuickExportEntry({
            chapterId: activeChapterId,
            t,
            toast: dialog.toast,
        });
    }, [activeChapterId, dialog.toast, t]);

    const handleOpenWorldGraph = useCallback(() => {
        setWorldTab("graph");
        window.location.hash = "#world-graph";
    }, [setWorldTab]);

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
        void import("@renderer/features/settings/components/SettingsModal");
    }, []);

    useEffect(() => {
        const handleOpenSettings = () => {
            setIsSettingsOpen(true);
        };
        window.addEventListener("luie:open-settings", handleOpenSettings);
        return () => {
            window.removeEventListener("luie:open-settings", handleOpenSettings);
        };
    }, []);

    if (uiMode === "focus") {
        return (
            <>
                <FocusLayout activeChapterTitle={activeChapterTitle} wordCount={wordCount}>
                    <FeatureErrorBoundary featureName="Editor">
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
                    </FeatureErrorBoundary>
                </FocusLayout>
                <SmartLinkTooltip />
            </>
        );
    }

    const sharedEditor = (
        <FeatureErrorBoundary featureName="Editor">
            <Editor
                key={activeChapterId}
                initialTitle={activeChapter ? activeChapter.title : ""}
                initialContent={activeChapter ? activeChapter.content : ""}
                onSave={handleSave}
                readOnly={!activeChapterId}
                chapterId={activeChapterId || undefined}
                onOpenWorldGraph={handleOpenWorldGraph}
                hideToolbar={uiMode === "docs" || uiMode === "scrivener" || uiMode === "editor"}
                hideFooter={true}
                hideTitle={uiMode === "docs" || uiMode === "scrivener" || uiMode === "editor"}
                scrollable={uiMode === "scrivener" || uiMode === "default"}
                onEditorReady={setDocEditor}
            />
        </FeatureErrorBoundary>
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
                    onOpenExport={handleQuickExport}
                    onOpenWorldGraph={handleOpenWorldGraph}
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
                    onOpenExport={handleQuickExport}
                    onRenameChapter={handleRenameChapter}
                    onSaveChapter={handleSave}
                    onOpenWorldGraph={handleOpenWorldGraph}
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
                    onOpenExport={handleQuickExport}
                    onOpenWorldGraph={handleOpenWorldGraph}
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
                    onOpenExport={handleQuickExport}
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
