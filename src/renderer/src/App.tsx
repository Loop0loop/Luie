import { useState, lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { type Editor as TiptapEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import MainLayout from "./components/layout/MainLayout";
import GoogleDocsLayout from "./components/layout/GoogleDocsLayout";
import FocusLayout from "./components/layout/FocusLayout";
import EditorLayout from "./components/layout/EditorLayout";
import Sidebar from "./components/sidebar/Sidebar";
import DocsSidebar from "./components/sidebar/DocsSidebar";
import Editor from "./components/editor/Editor";
import { SmartLinkTooltip } from "./components/editor/SmartLinkTooltip";
import ContextPanel from "./components/context/ContextPanel";
import ProjectTemplateSelector from "./components/layout/ProjectTemplateSelector";
import ScrivenerLayout from "./components/layout/ScrivenerLayout";
import ScrivenerSidebar from "./components/sidebar/ScrivenerSidebar";

import { useProjectStore } from "./stores/projectStore";
import { useUIStore, type DocsRightTab } from "./stores/uiStore";
import { useEditorStore } from "./stores/editorStore";
import { useEditorStatusStore } from "./stores/editorStatusStore";
import { useProjectInit } from "./hooks/useProjectInit";
import { useFileImport } from "./hooks/useFileImport";
import { useChapterManagement } from "./hooks/useChapterManagement";
import { useSplitView } from "./hooks/useSplitView";
import { useProjectTemplate } from "./hooks/useProjectTemplate";
import { useShortcuts } from "./hooks/useShortcuts";
import { emitShortcutCommand } from "./hooks/useShortcutCommand";
import { useShortcutStore } from "./stores/shortcutStore";
import { useToast } from "./components/common/ToastContext";
import { useDialog } from "./components/common/DialogProvider";
import {
  EDITOR_TOOLBAR_FONT_MIN,
  EDITOR_TOOLBAR_FONT_STEP,
} from "../../shared/constants/configs";
import {
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
} from "../../shared/constants/paths";
import { appBootstrapStatusSchema } from "../../shared/schemas/index.js";
import type { AppBootstrapStatus } from "../../shared/types/index.js";
import { api } from "./services/api";
import { openDocsRightTab as openDocsPanelTab } from "./services/docsPanelService";
import { createLayoutModeActions } from "./services/layoutModeActions";
import {
  captureUiModeIntegritySnapshot,
  getUiModeIntegrityViolations,
  type UiModeIntegritySnapshot,
} from "./services/uiModeIntegrity";
import { GlobalDragContext, type DragData } from "./components/common/GlobalDragContext";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

const SettingsModal = lazy(() => import("./components/settings/SettingsModal"));
const ResearchPanel = lazy(() => import("./components/research/ResearchPanel"));
const SnapshotViewer = lazy(() => import("./components/snapshot/SnapshotViewer"));
const ExportPreviewPanel = lazy(() => import("./components/export/ExportPreviewPanel"));
const ExportWindow = lazy(() => import("./components/export/ExportWindow"));

const parseBootstrapStatus = (value: unknown): AppBootstrapStatus | null => {
  const parsed = appBootstrapStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export default function App() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const dialog = useDialog();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] = useState<AppBootstrapStatus>({
    isReady: false,
  });
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const chapterChordRef = useRef<{ digits: string; timerId?: number }>({
    digits: "",
  });
  const uiModeIntegrityRef = useRef<UiModeIntegritySnapshot | null>(null);
  const [isExportWindow, setIsExportWindow] = useState(window.location.hash === "#export");

  useEffect(() => {
    const checkHash = () => {
      setIsExportWindow(window.location.hash === "#export");
    };
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  const view = useUIStore((state) => state.view);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const setContextOpen = useUIStore((state) => state.setContextOpen);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
  const docsRightTab = useUIStore((state) => state.docsRightTab);
  const setDocsRightTab = useUIStore((state) => state.setDocsRightTab);
  const isManuscriptMenuOpen = useUIStore((state) => state.isManuscriptMenuOpen);
  const loadShortcuts = useShortcutStore((state) => state.loadShortcuts);
  const projects = useProjectStore((state) => state.items);
  const setCurrentProject = useProjectStore((state) => state.setCurrentProject);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const updateProject = useProjectStore((state) => state.updateProject);
  const theme = useEditorStore((state) => state.theme);
  const themeTemp = useEditorStore((state) => state.themeTemp);
  const themeContrast = useEditorStore((state) => state.themeContrast);
  const themeAccent = useEditorStore((state) => state.themeAccent);
  const themeTexture = useEditorStore((state) => state.themeTexture);
  const fontSize = useEditorStore((state) => state.fontSize);
  const setFontSize = useEditorStore((state) => state.setFontSize);
  const uiMode = useEditorStore((state) => state.uiMode);
  const setUiMode = useEditorStore((state) => state.setUiMode);
  const wordCount = useEditorStatusStore((state) => state.wordCount);
  const isDocsMode = uiMode === "docs";

  const refreshBootstrapStatus = useCallback(async () => {
    setIsBootstrapLoading(true);
    try {
      const response = await api.app.getBootstrapStatus();
      const parsed = parseBootstrapStatus(response.data);
      if (response.success && parsed) {
        setBootstrapStatus(parsed);
        return;
      }

      setBootstrapStatus({
        isReady: false,
        error: t("bootstrap.fetchFailed"),
      });
    } catch {
      setBootstrapStatus({
        isReady: false,
        error: t("bootstrap.fetchFailed"),
      });
    } finally {
      setIsBootstrapLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshBootstrapStatus();
    const unsubscribe = api.app.onBootstrapStatus((status) => {
      const parsed = parseBootstrapStatus(status);
      if (!parsed) return;
      setBootstrapStatus(parsed);
      setIsBootstrapLoading(false);
    });
    return unsubscribe;
  }, [refreshBootstrapStatus]);

  // 커스텀 훅으로 로직 분리
  const { currentProject } = useProjectInit(bootstrapStatus.isReady);

  // 전역 테마 적용 (템플릿/에디터 등 모든 뷰에서 동작)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeTemp) document.documentElement.setAttribute("data-temp", themeTemp);
    if (themeContrast) document.documentElement.setAttribute("data-contrast", themeContrast);
    if (themeAccent) document.documentElement.setAttribute("data-accent", themeAccent);
    document.documentElement.setAttribute("data-texture", String(themeTexture));
  }, [theme, themeTemp, themeContrast, themeAccent, themeTexture]);

  useEffect(() => {
    if (!bootstrapStatus.isReady) return;
    void loadShortcuts();
  }, [bootstrapStatus.isReady, loadShortcuts]);
  
  const {
    chapters,
    activeChapterId,
    content,
    activeChapterTitle,
    handleSelectChapter,
    handleAddChapter,
    handleRenameChapter,
    handleDuplicateChapter,
    handleDeleteChapter,
    handleSave,
  } = useChapterManagement();

  const activeChapter = useMemo(() => 
    chapters.find((c) => c.id === activeChapterId), 
    [chapters, activeChapterId]
  );

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const uiState = useUIStore.getState();
    const snapshot = captureUiModeIntegritySnapshot({
      editor: useEditorStore.getState(),
      ui: {
        ...uiState,
        isSplitView: false,
        splitRatio: 0.5,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as unknown as any, // Bypass strict type check for legacy fields until UiModeIntegrityUiState type definitions are fully cleaned up in another task if needed.
    });
    const previous = uiModeIntegrityRef.current;
    if (previous) {
      const violations = getUiModeIntegrityViolations(previous, snapshot);
      if (violations.length > 0) {
        void api.logger.warn("uiMode integrity violation detected", {
          from: previous.uiMode,
          to: snapshot.uiMode,
          violations,
        });
      }
    }

    uiModeIntegrityRef.current = snapshot;
  });

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
  }, [
    activeChapterId,
    dialog,
    handleDeleteChapter,
    isManuscriptMenuOpen,
    t,
  ]);

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

  // ── DnD 드롭 핸들러 (uiMode별 분기) ──
  const { setMainView } = useUIStore();

  const handleDropToCenter = useCallback((data: DragData) => {
    if (data.type === "chapter") {
      handleSelectChapter(data.id);
      return;
    }

    if (uiMode === "scrivener") {
      // Scrivener에서는 mainView 전환
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
      // Docs/Editor/Default에서는 리서치 패널 열기
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

  const handleDropToSplit = useCallback((data: DragData) => {
    // Note: React-Resizable-Panels will handle drag and drop inserts differently based on the group layout. 
    // This is currently simplifying the logic to just add it to the end of the flex list.
    // Insert index logic could be added using the side argument if required.
    switch (data.type) {
      case "chapter":
        addPanel({ type: "editor", id: data.id });
        break;
      case "character":
        addPanel({ type: "research", tab: "character", id: data.id });
        break;
      case "world":
      case "mindmap":
      case "plot":
      case "drawing":
      case "synopsis":
        addPanel({ type: "research", tab: "world", id: data.id });
        break;
      case "memo":
        addPanel({ type: "research", tab: "scrap", id: data.id });
        break;
      case "analysis":
        addPanel({ type: "research", tab: "analysis", id: data.id });
        break;
    }
  }, [addPanel]);

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
          emitShortcutCommand({
            type: "sidebar.section.toggle",
            section: "manuscript",
          }),
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
      "editor.fontSize.increase": () =>
        void setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP),
      "editor.fontSize.decrease": () =>
        void setFontSize(
          Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP),
        ),
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

  const { handleSelectProject } = useProjectTemplate(
    (id: string) => {
      handleSelectChapter(id);
    }
  );

  useFileImport(currentProject);

  const { setView } = useUIStore();

  const prefetchSettings = useCallback(() => {
    void import("./components/settings/SettingsModal");
  }, []);

  const handleOpenExistingProject = useCallback(
    (project: (typeof projects)[number]) => {
      setCurrentProject(project);
      setView("editor");
    },
    [setCurrentProject, setView],
  );

  const handleOpenLuieFile = useCallback(async () => {
    try {
      const response = await api.fs.selectFile({
        title: t("home.projectTemplate.actions.openLuie"),
        filters: [{ name: LUIE_PACKAGE_FILTER_NAME, extensions: [LUIE_PACKAGE_EXTENSION_NO_DOT] }],
      });

      if (!response.success || !response.data) {
        return;
      }

      const selectedPath = response.data;
      const imported = await api.project.openLuie(selectedPath);
      if (imported.success && imported.data) {
        setCurrentProject(imported.data.project);
        setView("editor");
        if (imported.data.recovery) {
          showToast(t("project.toast.recoveredFromDb"), "info");
        }
        if (imported.data.conflict === "db-newer") {
          showToast(t("project.toast.dbNewerSynced"), "info");
        }
      }
    } catch (error) {
      api.logger.error("Failed to open luie file", error);
    }
  }, [setCurrentProject, setView, showToast, t]);

  const handleOpenSnapshotBackup = useCallback(async () => {
    try {
      const response = await api.fs.selectSnapshotBackup();
      if (!response.success || !response.data) {
        return;
      }

      const importResult = await api.snapshot.importFromFile(response.data);
      if (importResult.success && importResult.data) {
        await loadProjects();
        setCurrentProject(importResult.data);
        setView("editor");
      }
    } catch (error) {
      api.logger.error("Failed to import snapshot backup", error);
    }
  }, [loadProjects, setCurrentProject, setView]);



  if (isExportWindow) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#333] text-white">{t("common.loading")}</div>}>
         <ExportWindow />
      </Suspense>
    );
  }

  if (!bootstrapStatus.isReady) {
    const showError = Boolean(bootstrapStatus.error) && !isBootstrapLoading;

    return (
      <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
        <div className="w-full max-w-3xl rounded-2xl border border-border bg-panel p-8 shadow-lg">
          <div className="space-y-4">
            <div className="h-6 w-52 rounded-md bg-surface animate-pulse" />
            <div className="h-4 w-full rounded-md bg-surface animate-pulse" />
            <div className="h-4 w-[82%] rounded-md bg-surface animate-pulse" />
            <div className="h-4 w-[68%] rounded-md bg-surface animate-pulse" />
          </div>

          {!showError && (
            <p className="mt-6 text-sm text-muted">
              {t("bootstrap.initializing")}
            </p>
          )}

          {showError && (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-danger-fg">
                {bootstrapStatus.error}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    void refreshBootstrapStatus();
                  }}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  {t("bootstrap.retry")}
                </button>
                <button
                  onClick={() => {
                    void api.app.quit();
                  }}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-fg hover:bg-surface-hover transition-colors"
                >
                  {t("bootstrap.quit")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === "template" || !currentProject) {
    return (
      <ProjectTemplateSelector
        onSelectProject={handleSelectProject}
        projects={projects}
        onOpenProject={handleOpenExistingProject}
        onOpenLuieFile={handleOpenLuieFile}
        onOpenSnapshotBackup={handleOpenSnapshotBackup}
      />
    );
  }

  if (uiMode === "focus") {
    return (
      <>
        <FocusLayout
          activeChapterTitle={activeChapterTitle}
          wordCount={wordCount}
        >
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

  // Editor Content (Split View with react-resizable-panels)
  const editorContent = (
    <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative">
      {/* Main Editor Panel */}
      <Panel defaultSize={panels.length > 0 ? 50 : 100} minSize={20} className="min-w-0 bg-canvas relative">
        <Editor
          key={activeChapterId ?? "main-editor"}
          chapterId={activeChapterId ?? undefined}
          initialTitle={activeChapterTitle}
          initialContent={content}
          onSave={handleSave}
        />
      </Panel>

      {panels.map((panel) => (
        <Suspense key={panel.id} fallback={<div style={{ padding: 20 }}>{t("common.loading")}</div>}>
          <PanelResizeHandle className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-50 relative" />
          <Panel defaultSize={panel.size} minSize={20} className="min-w-0 bg-panel relative flex flex-col">
            <div className="flex justify-between items-center p-2 border-b border-border bg-surface text-xs font-semibold text-muted">
               {/* 
                 TODO: i18n label parsing. 
                 Temporarily using raw text, we will let inside components handle full headers later or abstract this out 
               */}
               <span className="uppercase">{panel.content.type}</span>
               <button onClick={() => removePanel(panel.id)} className="hover:bg-surface-hover rounded p-1">✕</button>
            </div>
            
            <div className="flex-1 overflow-hidden relative">
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
                    )?.content || ""
                  }
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
            </div>
          </Panel>
        </Suspense>
      ))}
    </PanelGroup>
  );

  return (
    <GlobalDragContext onDropToCenter={handleDropToCenter} onDropToSplit={handleDropToSplit}>
      {uiMode === 'docs' ? (
            <GoogleDocsLayout
                sidebar={
                  <DocsSidebar
                    chapters={chapters}
                    activeChapterId={activeChapterId ?? undefined}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                    onRenameChapter={handleRenameChapter}
                    onDuplicateChapter={handleDuplicateChapter}
                    onDeleteChapter={handleDeleteChapter}
                  />
                }
                activeChapterId={activeChapterId ?? undefined}
                activeChapterTitle={activeChapterTitle}
                activeChapterContent={content}
                currentProjectId={currentProject?.id}
                editor={docEditor}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onRenameChapter={handleRenameChapter}
                onSaveChapter={handleSave}
            >
                  <Editor
                    key={activeChapterId} // Force re-mount on chapter change to ensure clean state
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
                <DocsSidebar
                  chapters={chapters}
                  activeChapterId={activeChapterId ?? undefined}
                  onSelectChapter={handleSelectChapter}
                  onAddChapter={handleAddChapter}
                  onRenameChapter={handleRenameChapter}
                  onDuplicateChapter={handleDuplicateChapter}
                  onDeleteChapter={handleDeleteChapter}
                />
              }
              activeChapterId={activeChapterId ?? undefined}
              activeChapterTitle={activeChapterTitle}
              currentProjectId={currentProject?.id}
              editor={docEditor}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onRenameChapter={handleRenameChapter}
              onSaveChapter={handleSave}
         >
               <Editor
                 key={activeChapterId}
                 initialTitle={activeChapter ? activeChapter.title : ""}
                 initialContent={activeChapter ? activeChapter.content : ""}
                 onSave={handleSave}
                 readOnly={!activeChapterId}
                 chapterId={activeChapterId || undefined}
                 hideToolbar={true} // Ribbon handles toolbars
                 hideFooter={true}  // Layout handles footer
                 hideTitle={true}   // Layout handles title
                 scrollable={false} // Layout handles scrolling
                 onEditorReady={setDocEditor}
               />
         </EditorLayout>
      ) : uiMode === "scrivener" ? (
         <ScrivenerLayout
            sidebar={
                <ScrivenerSidebar
                    chapters={chapters}
                    activeChapterId={activeChapterId ?? undefined}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                    onRenameChapter={handleRenameChapter}
                    onDuplicateChapter={handleDuplicateChapter}
                    onDeleteChapter={handleDeleteChapter}
                    currentProjectId={currentProject?.id}
                />
            }
            activeChapterId={activeChapterId ?? undefined}
            activeChapterTitle={activeChapterTitle}
            editor={docEditor}
            onOpenSettings={() => setIsSettingsOpen(true)}
         >
             <Editor
                 key={activeChapterId}
                 initialTitle={activeChapter ? activeChapter.title : ""}
                 initialContent={activeChapter ? activeChapter.content : ""}
                 onSave={handleSave}
                 readOnly={!activeChapterId}
                 chapterId={activeChapterId || undefined}
                 hideToolbar={true} // Ribbon handles toolbars
                 hideFooter={true}  // Layout handles footer
                 hideTitle={true}   // Layout handles title
                 scrollable={true} 
                 onEditorReady={setDocEditor}
             />
         </ScrivenerLayout>
      ) : (
        <MainLayout
            sidebar={
                <Sidebar
                    chapters={chapters}
                    activeChapterId={activeChapterId ?? undefined}
                    currentProjectTitle={currentProject?.title}
                    currentProjectId={currentProject?.id}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                    onRenameChapter={handleRenameChapter}
                    onDuplicateChapter={handleDuplicateChapter}
                    onDeleteChapter={handleDeleteChapter}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onPrefetchSettings={prefetchSettings}
                    onSelectResearchItem={handleSelectResearchItem}
                    onSplitView={handleSplitView}
                />
            }
            contextPanel={
                <ContextPanel activeTab={contextTab} onTabChange={setContextTab} />
            }
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
