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
import {
  useChapterContentStatus,
  useChapterManagement,
  useChapterStore,
} from "@renderer/domains/manuscript";
import {
  ensureChapterContent,
  peekChapterContent,
} from "@renderer/features/manuscript/stores/chapterContentStore";
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
    mainViewType,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      isContextOpen: state.regions.rightPanel.open,
      setRegionOpen: state.setRegionOpen,
      setWorldTab: state.setWorldTab,
      docsRightTab: state.regions.rightPanel.activeTab,
      closeRightPanel: state.closeRightPanel,
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

  // NOTE: 루트는 본문 "문자열"을 구독하지 않는다. 자동 저장이 캐시에 쓸 때마다 이 컴포넌트
  // 아래 워크스페이스 트리 전체가 리렌더됐던 구조다. 상태(원시값)만 구독하고, 본문은 로드
  // 완료 시점에 1회 peek해 Editor에 넘긴다 — 이후 캐시 갱신은 Editor 내부 상태가 출처다.
  const { isLoaded: isChapterContentLoaded, error: chapterLoadError } =
    useChapterContentStatus(activeChapterId);
  const content = isChapterContentLoaded
    ? peekChapterContent(activeChapterId) ?? ""
    : "";

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

  /**
   * 원고 삭제 단축키.
   *
   * WHY `isManuscriptMenuOpen` 가드를 뺐는가: 그 가드는 사이드바 항목의 컨텍스트 메뉴가
   * 열려 있을 때만 통과해서, 일반 집필 중에는 단축키가 항상 조기 반환했다. 사용자에게는
   * 완전 무동작으로 보였다.
   *
   * WHY 여기서 편집 여부를 따지지 않는가: 편집 영역 판정은 `useShortcuts`가 이벤트
   * 시점에 이미 한다. `chapter.delete`를 `ALLOW_IN_EDITORS`에서 빼두면 에디터에 포커스가
   * 있을 때 이 핸들러가 호출되지 않고 macOS의 '줄 시작까지 삭제'가 그대로 동작한다.
   * 그래서 이 함수는 '에디터 밖에서 눌렸다'는 전제 하에 활성 원고를 지운다.
   *
   * NOTE: 사용자 요청은 '사이드바에서 원고를 마우스로 겨냥한 동안'이었다. 그 hover 상태는
   * `useSidebarLogic`의 로컬 state라 store로 올려야 접근 가능한데, 그러면 hover마다 store
   * write가 생겨 사이드바 리렌더 비용이 되살아난다. 포커스 기준이 같은 의도를 만족하면서
   * 그 비용을 만들지 않는다.
   */
  const handleDeleteActiveChapter = useCallback(async () => {
    if (!activeChapterId) return;
    const confirmed = await dialog.confirm({
      title: t("sidebar.menu.delete"),
      message: t("bootstrap.deleteManuscriptConfirm"),
      isDestructive: true,
    });
    if (!confirmed) return;
    await handleDeleteChapter(activeChapterId);
  }, [activeChapterId, dialog, handleDeleteChapter, t]);

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
        panels,
        removePanel,
        handleSelectResearchItem,
        handleOpenExport,
        onToggleManuscriptLegacy: () =>
          emitShortcutCommand({
            type: "sidebar.section.toggle",
            section: "manuscript",
          }),
        onOpenSidebarSectionLegacy: (section: "snapshot" | "trash") =>
          emitShortcutCommand({ type: "sidebar.section.open", section }),
        onToggleSidebarSectionLegacy: (section: "snapshot" | "trash") =>
          emitShortcutCommand({ type: "sidebar.section.toggle", section }),
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
      panels,
      removePanel,
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
    editor: docEditor,
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
    activeChapterId !== null && chapterLoadError ? (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-app p-8 text-center">
        <p className="text-sm text-muted">
          {t("editor.chapterLoadFailed", {
            message: chapterLoadError,
            defaultValue: `본문을 불러오지 못했습니다: ${chapterLoadError}`,
          })}
        </p>
        <button
          type="button"
          onClick={() => {
            if (activeChapterId) {
              void ensureChapterContent(activeChapterId);
            }
          }}
          className="rounded-control border border-border px-3 py-1.5 text-xs text-fg transition-colors hover:bg-surface-hover"
        >
          {t("common.retry", { defaultValue: "다시 시도" })}
        </button>
      </div>
    ) : (
      <FeatureErrorBoundary featureName="Editor">
        <Editor
          // NOTE: key에 activeChapterId를 넣지 않는다. 챕터 전환은 Editor 내부의
          // setContent 스왑으로 처리하고, 리마운트는 스냅샷 복원 리비전에만 쓴다.
          // 리마운트 = TipTap 18개 확장 재구축 + 전체 문서 동기 파스라 전환이 1초 가까이
          // 끊겼던 주원인이다.
          key={`editor-rev-${contentRevision}`}
          initialTitle={activeChapter ? activeChapter.title : ""}
          initialContent={content}
          contentReady={isChapterContentLoaded}
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
