import { useState, Suspense, useCallback, useMemo, useEffect } from "react";
import { type Editor as TiptapEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  Editor,
  SmartLinkTooltip,
  useEditorStore,
} from "@renderer/domains/editor";

import { useProjectStore } from "@renderer/domains/project";
import {
  useUIStore,
  type DocsRightTab,
} from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import { useChapterManagement, useChapterStore } from "@renderer/domains/manuscript";
import { useChapterContent } from "@renderer/features/manuscript/hooks/useChapterContent";
import { useSplitView } from "@renderer/features/workspace/hooks/useSplitView";
import { useWorkspaceDropHandlers } from "@renderer/features/workspace/hooks/useWorkspaceDropHandlers";
import {
  getProjectLayoutPersistenceMode,
  useProjectLayoutPersistence,
} from "@renderer/features/workspace/hooks/useProjectLayoutPersistence";
import { emitShortcutCommand } from "@renderer/features/workspace/hooks/useShortcutCommand";
import { useDialog } from "@shared/ui/useDialog";
import { openDocsRightTab as openDocsPanelTab } from "@renderer/features/workspace/services/docsPanelService";
import { createLayoutModeActions } from "@renderer/features/workspace/services/layoutModeActions";
import { openQuickExportEntry } from "@renderer/features/workspace/services/exportEntryService";
import { GlobalDragContext } from "@shared/ui/GlobalDragContext";
import { useEditorRootShortcuts } from "@renderer/features/workspace/components/useEditorRootShortcuts";
import { FeatureErrorBoundary } from "@renderer/shared/error-boundaries/FeatureErrorBoundary";
import type { SettingsTabId } from "@renderer/domains/settings";
import {
  DataRecoveryBanner,
  layoutFallback,
  OfflineBanner,
  SettingsModal,
  UpdaterNotification,
  WorkspacePanels,
} from "./rootShell";
import { FloatingAnalysisPanel } from "./FloatingAnalysisPanel";
import { useProjectQuitFlush } from "@renderer/features/workspace/hooks/useProjectQuitFlush";
import { WorkspaceLayoutRouter } from "./WorkspaceLayoutRouter";
export default function EditorRoot() {
  useProjectQuitFlush();
  const { t } = useTranslation();
  const dialog = useDialog();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    SettingsTabId | undefined
  >(undefined);
  const [isDocsMobileView, setIsDocsMobileView] = useState(false);
  const uiMode = useEditorStore((state) => state.uiMode);
  const fontSize = useEditorStore((state) => state.fontSize);
  const setFontSize = useEditorStore((state) => state.setFontSize);

  const isDocsMode = uiMode === "docs";

  const {
    isSidebarOpen,
    isContextOpen,
    setRegionOpen,
    setWorldTab,
    docsRightTab,
    closeRightPanel,
    isManuscriptMenuOpen,
    mainViewType,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      isContextOpen: state.regions.rightPanel.open,
      setRegionOpen: state.setRegionOpen,
      setWorldTab: state.setWorldTab,
      docsRightTab: state.regions.rightPanel.activeTab,
      closeRightPanel: state.closeRightPanel,
      isManuscriptMenuOpen: state.isManuscriptMenuOpen,
      mainViewType: state.mainView.type,
    })),
  );  
  const currentProject = useProjectStore((state) => state.currentProject);
  const updateProject = useProjectStore((state) => state.updateProject);

  const layoutPersistenceMode = getProjectLayoutPersistenceMode(
    uiMode,
    mainViewType,
  );
  useProjectLayoutPersistence(
    currentProject?.id ?? null,
    layoutPersistenceMode,
  );

  const setProjectAwareSidebarOpen = useCallback(
    (open: boolean) => {
      setRegionOpen("leftSidebar", open);
    },
    [setRegionOpen],
  );

  const toggleProjectAwareSidebar = useCallback(
    () => setProjectAwareSidebarOpen(!isSidebarOpen),
    [isSidebarOpen, setProjectAwareSidebarOpen],
  );

  const {
    chapters,
    activeChapterId,
    activeChapterTitle,
    handleSelectChapter,
    handleAddChapter,
    handleRenameChapter,
    handleDeleteChapter,
    handleSave,
  } = useChapterManagement();

  // NOTE: 본문은 목록이 아니라 본문 캐시에서 받는다. `isLoaded`가 false인 동안 Editor를
  // 마운트하면 빈 본문으로 시작하고, 그 상태에서 자동 저장이 발화하면 원본 본문을 덮어쓴다.
  // 그래서 아래에서 로딩이 끝날 때까지 에디터 자리를 비워 둔다.
  const { content, isLoaded: isChapterContentLoaded } =
    useChapterContent(activeChapterId);

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId),
    [chapters, activeChapterId],
  );
  // NOTE: 스냅샷 복원 시 같은 챕터의 본문이 바뀌므로 리비전을 key에 넣어 Editor를 리마운트한다.
  const contentRevision = useChapterStore(
    (state) => state.contentRevision,
  );

  const [docEditor, setDocEditor] = useState<TiptapEditor | null>(null);

  const setMainView = useUIStore((state) => state.setMainView);

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
    addPanel,
    removePanel,
    handleSelectResearchItem,
    handleOpenSnapshot,
    handleSplitView,
    handleOpenExport,
  } = useSplitView(activeChapterId ?? undefined);
  const additionalPanelIds = useMemo(
    () => panels.map((panel) => panel.id),
    [panels],
  );

  const handleSelectChapterWithView = useCallback(
    (id: string) => {
      handleSelectChapter(id);
    },
    [handleSelectChapter],
  );

  const { handleDropToCenter, handleDropToSplit } = useWorkspaceDropHandlers({
    uiMode,
    handleSelectChapter: handleSelectChapterWithView,
    handleSelectResearchItem,
    setMainView,
    setWorldTab,
    addPanel,
    handleOpenSnapshot,
  });

  const openDocsRightTab = useCallback((tab: Exclude<DocsRightTab, null>) => {
    openDocsPanelTab(tab);
  }, []);

  const setContextOpen = useCallback(
    (open: boolean) => setRegionOpen("rightPanel", open),
    [setRegionOpen],
  );

  const layoutModeActions = useMemo(
    () =>
      createLayoutModeActions({
        isDocsMode,
        isContextOpen,
        docsRightTab,
        activeChapterId: activeChapterId ?? null,
        openDocsRightTab,
        closeRightPanel,
        toggleLeftSidebar: toggleProjectAwareSidebar,
        setContextOpen,
        addPanel,
        handleSelectResearchItem,
        handleOpenExport,
        onToggleManuscriptLegacy: () =>
          emitShortcutCommand({
            type: "sidebar.section.toggle",
            section: "manuscript",
          }),
        onOpenSidebarSectionLegacy: (section: "snapshot" | "trash") =>
          emitShortcutCommand({ type: "sidebar.section.open", section }),
      }),
    [
      activeChapterId,
      docsRightTab,
      isDocsMode,
      isContextOpen,
      openDocsRightTab,
      closeRightPanel,
      toggleProjectAwareSidebar,
      setContextOpen,
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
    setMainView({ type: "canvas" });
  }, [setMainView]);

  const handleCloseCanvas = useCallback(() => {
    setMainView({ type: "editor" });
  }, [setMainView]);

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
    currentProjectId: currentProject?.id ?? null,
    handleDeleteActiveChapter,
    openChapterByIndex,
    handleRenameProject,
    handleQuickExport,
    setSidebarOpen: setProjectAwareSidebarOpen,
    isSidebarOpen,
    layoutModeActions,
    setWorldTab,
    setFontSize,
    fontSize,
  });

  const prefetchSettings = useCallback(() => {
    void import("@renderer/domains/settings");
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  useEffect(() => {
    const handleOpenSettings = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab?: SettingsTabId }>;
      const tab = customEvent.detail?.tab;
      setSettingsInitialTab(tab);
      setIsSettingsOpen(true);
    };
    window.addEventListener("luie:open-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("luie:open-settings", handleOpenSettings);
    };
  }, []);

  const sharedEditor =
    activeChapterId !== null && !isChapterContentLoaded ? (
      layoutFallback
    ) : (
      <FeatureErrorBoundary featureName="Editor">
        <Editor
          key={`editor-${activeChapterId ?? "none"}-${contentRevision}`}
          initialTitle={activeChapter ? activeChapter.title : ""}
          initialContent={content}
        onSave={handleSave}
        readOnly={!activeChapterId}
        chapterId={activeChapterId || undefined}
        onOpenWorldGraph={handleOpenWorldGraph}
        mobileView={isDocsMode ? isDocsMobileView : undefined}
        hideToolbar={
          uiMode === "docs" || uiMode === "scrivener" || uiMode === "editor"
        }
        hideFooter={uiMode !== "default"}
        hideTitle={
          uiMode === "docs" || uiMode === "scrivener" || uiMode === "editor"
        }
        scrollable={uiMode === "scrivener" || uiMode === "default"}
        autoHeight={uiMode === "docs"}
        onEditorReady={setDocEditor}
      />
    </FeatureErrorBoundary>
    );
  const additionalPanelsComponent = (
    <Suspense fallback={null}>
      <WorkspacePanels
        panels={panels}
        removePanel={removePanel}
        chapters={chapters}
        currentProjectId={currentProject?.id}
        activeChapterId={activeChapterId ?? undefined}
        activeChapterTitle={activeChapterTitle}
        onSave={handleSave}
      />
    </Suspense>
  );
  // Snapshot/Research가 AI View와 맞닿을 때만 rounded 경계를 사용한다.
  const isResearchPanelAdjacent = ["research", "snapshot"].includes(
    panels[0]?.content.type ?? "",
  );
  const isEditorPanelAdjacent = panels[0]?.content.type === "editor";

  return (
    <GlobalDragContext
      onDropToCenter={handleDropToCenter}
      onDropToSplit={handleDropToSplit}
    >
      <Suspense fallback={null}>
        <OfflineBanner />
        <DataRecoveryBanner />
        <UpdaterNotification />
      </Suspense>
      <Suspense fallback={layoutFallback}>
        <WorkspaceLayoutRouter
          uiMode={uiMode}
          mainViewType={mainViewType}
          editor={docEditor}
          sharedEditor={sharedEditor}
          additionalPanels={additionalPanelsComponent}
          additionalPanelIds={additionalPanelIds}
          activeChapterId={activeChapterId ?? undefined}
          activeChapterTitle={activeChapterTitle}
          currentProjectId={currentProject?.id}
          isResearchPanelAdjacent={isResearchPanelAdjacent}
          isEditorPanelAdjacent={isEditorPanelAdjacent}
          isDocsMobileView={isDocsMobileView}
          onToggleDocsMobileView={() =>
            setIsDocsMobileView((current) => !current)
          }
          onOpenSettings={handleOpenSettings}
          onPrefetchSettings={prefetchSettings}
          onSelectResearchItem={handleSelectResearchItem}
          onSplitView={handleSplitView}
          onRenameChapter={handleRenameChapter}
          onSaveChapter={handleSave}
          onOpenExport={handleQuickExport}
          onOpenWorldGraph={handleOpenWorldGraph}
          onCloseCanvas={handleCloseCanvas}
        />
      </Suspense>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            initialTab={settingsInitialTab}
            onClose={() => {
              setIsSettingsOpen(false);
              setSettingsInitialTab(undefined);
            }}
          />
        </Suspense>
      )}
      <SmartLinkTooltip isSettingsOpen={isSettingsOpen} />

      <FloatingAnalysisPanel />
    </GlobalDragContext>
  );
}
