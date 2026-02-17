import { useState, lazy, Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import { type Editor as TiptapEditor } from "@tiptap/react"; // Added import
import { useTranslation } from "react-i18next";
import MainLayout from "./components/layout/MainLayout";
import GoogleDocsLayout from "./components/layout/GoogleDocsLayout";
import Sidebar from "./components/sidebar/Sidebar";
import DocsSidebar from "./components/sidebar/DocsSidebar";
import Editor from "./components/editor/Editor";
import ContextPanel from "./components/context/ContextPanel";
import ProjectTemplateSelector from "./components/layout/ProjectTemplateSelector";
import { useProjectStore } from "./stores/projectStore";
import { useUIStore } from "./stores/uiStore";
import { useEditorStore } from "./stores/editorStore";
import { useProjectInit } from "./hooks/useProjectInit";
import { useFileImport } from "./hooks/useFileImport";
import { useChapterManagement } from "./hooks/useChapterManagement";
import { useSplitView } from "./hooks/useSplitView";
import { useProjectTemplate } from "./hooks/useProjectTemplate";
import { useShortcuts } from "./hooks/useShortcuts";
import { emitShortcutCommand } from "./hooks/useShortcutCommand";
import { useShortcutStore } from "./stores/shortcutStore";
import { useToast } from "./components/common/ToastContext";
import {
  EDITOR_TOOLBAR_FONT_MIN,
  EDITOR_TOOLBAR_FONT_STEP,
} from "../../shared/constants/configs";
import {
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
} from "../../shared/constants/paths";
import { api } from "./services/api";

const SettingsModal = lazy(() => import("./components/settings/SettingsModal"));
const ResearchPanel = lazy(() => import("./components/research/ResearchPanel"));
const SnapshotViewer = lazy(() => import("./components/snapshot/SnapshotViewer"));
const ExportPreviewPanel = lazy(() => import("./components/export/ExportPreviewPanel"));
const ExportWindow = lazy(() => import("./components/export/ExportWindow"));

export default function App() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chapterChordRef = useRef<{ digits: string; timerId?: number }>({
    digits: "",
  });
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
  const isContextOpen = useUIStore((state) => state.isContextOpen);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const setContextOpen = useUIStore((state) => state.setContextOpen);
  const setSplitSide = useUIStore((state) => state.setSplitSide);
  const toggleSplitSide = useUIStore((state) => state.toggleSplitSide);
  const splitSide = useUIStore((state) => state.splitSide);
  const setWorldTab = useUIStore((state) => state.setWorldTab);
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

  // 커스텀 훅으로 로직 분리
  const { currentProject } = useProjectInit();

  // 전역 테마 적용 (템플릿/에디터 등 모든 뷰에서 동작)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeTemp) document.documentElement.setAttribute("data-temp", themeTemp);
    if (themeContrast) document.documentElement.setAttribute("data-contrast", themeContrast);
    if (themeAccent) document.documentElement.setAttribute("data-accent", themeAccent);
    document.documentElement.setAttribute("data-texture", String(themeTexture));
  }, [theme, themeTemp, themeContrast, themeAccent, themeTexture]);

  useEffect(() => {
    void loadShortcuts();
  }, [loadShortcuts]);
  
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

  const handleDeleteActiveChapter = useCallback(() => {
    if (!isManuscriptMenuOpen) return;
    if (!activeChapterId) return;
    const confirmed = window.confirm("이 원고를 삭제할까요?");
    if (!confirmed) return;
    void handleDeleteChapter(activeChapterId);
  }, [activeChapterId, handleDeleteChapter, isManuscriptMenuOpen]);

  const {
    isSplitView,
    splitRatio,
    rightPanelContent,
    contextTab,
    setContextTab,
    setSplitView,
    handleSelectResearchItem,
    handleSplitView,
    handleOpenExport,
    startResizeSplit,
  } = useSplitView();

  const openResearchTab = useCallback(
    (tab: "character" | "world" | "scrap" | "analysis", side: "left" | "right") => {
      setSplitSide(side);
      handleSelectResearchItem(tab);
    },
    [handleSelectResearchItem, setSplitSide],
  );

  const openExportPreview = useCallback(
    (side: "left" | "right") => {
      setSplitSide(side);
      handleOpenExport();
    },
    [handleOpenExport, setSplitSide],
  );

  const openEditorInSplit = useCallback(
    (side: "left" | "right") => {
      if (!activeChapterId) return;
      setSplitSide(side);
      handleSplitView("vertical", activeChapterId);
    },
    [activeChapterId, handleSplitView, setSplitSide],
  );

  const handleQuickExport = useCallback(() => {
    if (!activeChapterId) return;
    void api.window.openExport(activeChapterId);
  }, [activeChapterId]);

  const handleRenameProject = useCallback(async () => {
    if (!currentProject?.id) return;
    const nextTitle = window
      .prompt("프로젝트 이름을 입력해주세요.", currentProject.title ?? "")
      ?.trim();
    if (!nextTitle || nextTitle === currentProject.title) return;
    await updateProject(currentProject.id, nextTitle);
  }, [currentProject, updateProject]);

  const shortcutHandlers = useMemo(
    () => ({
      "app.openSettings": () => setIsSettingsOpen(true),
      "app.closeWindow": () => void api.window.close(),
      "app.quit": () => void api.app.quit(),
      "chapter.new": () => void handleAddChapter(),
      "chapter.save": () => void handleSave(activeChapterTitle, content),
      "chapter.delete": () => handleDeleteActiveChapter(),
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
      "view.toggleContextPanel": () => setContextOpen(!isContextOpen),
      "view.context.open": () => setContextOpen(true),
      "view.context.close": () => setContextOpen(false),
      "sidebar.section.manuscript.toggle": () =>
        emitShortcutCommand({ type: "sidebar.section.toggle", section: "manuscript" }),
      "sidebar.section.snapshot.open": () =>
        emitShortcutCommand({ type: "sidebar.section.open", section: "snapshot" }),
      "sidebar.section.trash.open": () =>
        emitShortcutCommand({ type: "sidebar.section.open", section: "trash" }),
      "project.rename": () => void handleRenameProject(),
      "research.open.character": () => openResearchTab("character", "right"),
      "research.open.world": () => openResearchTab("world", "right"),
      "research.open.scrap": () => openResearchTab("scrap", "right"),
      "research.open.analysis": () => openResearchTab("analysis", "right"),
      "research.open.character.left": () => openResearchTab("character", "left"),
      "research.open.world.left": () => openResearchTab("world", "left"),
      "research.open.scrap.left": () => openResearchTab("scrap", "left"),
      "research.open.analysis.left": () => openResearchTab("analysis", "left"),
      "character.openTemplate": () => emitShortcutCommand({ type: "character.openTemplate" }),
      "world.tab.synopsis": () => setWorldTab("synopsis"),
      "world.tab.terms": () => setWorldTab("terms"),
      "world.tab.mindmap": () => setWorldTab("mindmap"),
      "world.tab.drawing": () => setWorldTab("drawing"),
      "world.tab.plot": () => setWorldTab("plot"),
      "world.addTerm": () => emitShortcutCommand({ type: "world.addTerm" }),
      "scrap.addMemo": () => emitShortcutCommand({ type: "scrap.addMemo" }),
      "export.openPreview": () => openExportPreview("right"),
      "export.openWindow": () => handleQuickExport(),
      "editor.openRight": () => openEditorInSplit("right"),
      "editor.openLeft": () => openEditorInSplit("left"),
      "split.swapSides": () => toggleSplitSide(),
      "editor.fontSize.increase": () =>
        void setFontSize(fontSize + EDITOR_TOOLBAR_FONT_STEP),
      "editor.fontSize.decrease": () =>
        void setFontSize(
          Math.max(EDITOR_TOOLBAR_FONT_MIN, fontSize - EDITOR_TOOLBAR_FONT_STEP),
        ),
      "window.toggleFullscreen": () => void api.window.toggleFullscreen(),
    }),
    [
      activeChapterTitle,
      content,
      handleAddChapter,
      handleSave,
      handleDeleteActiveChapter,
      isContextOpen,
      isSidebarOpen,
      openChapterByIndex,
      handleRenameProject,
      openResearchTab,
      openExportPreview,
      handleQuickExport,
      openEditorInSplit,
      toggleSplitSide,
      setWorldTab,
      setFontSize,
      fontSize,
      setContextOpen,
      setSidebarOpen,
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
        title: "Luie 파일 열기",
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
      <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#333] text-white">Loading...</div>}>
         <ExportWindow />
      </Suspense>
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

  // Editor Content (Split View)
  const editorContent = (
        <div id="split-view-container" className="flex w-full h-full flex-1 overflow-hidden relative">
          {(() => {
            const mainPane = (
              <div
                className="h-full overflow-hidden relative min-w-0 bg-canvas"
                style={{ flex: isSplitView ? splitRatio : 1 }}
              >
                <Editor
                  key={activeChapterId ?? "main-editor"}
                  chapterId={activeChapterId ?? undefined}
                  initialTitle={activeChapterTitle}
                  initialContent={content}
                  onSave={handleSave}
                />
              </div>
            );

            const secondaryPane = (
              <div
                className="h-full overflow-hidden relative min-w-0 bg-panel"
                style={{ flex: 1 - splitRatio }}
              >
                <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
                  {rightPanelContent.type === "research" ? (
                    <ResearchPanel
                      activeTab={rightPanelContent.tab || "character"}
                      onClose={() => setSplitView(false)}
                    />
                  ) : rightPanelContent.type === "snapshot" &&
                    rightPanelContent.snapshot ? (
                    <SnapshotViewer
                      snapshot={rightPanelContent.snapshot}
                      currentContent={
                        chapters.find(
                          (c) =>
                            c.projectId === currentProject?.id &&
                            c.id === rightPanelContent.snapshot?.chapterId,
                        )?.content || ""
                      }
                      onApplySnapshotText={async (nextContent) => {
                        if (!activeChapterId) return;
                        await handleSave(activeChapterTitle, nextContent);
                      }}
                    />
                  ) : rightPanelContent.type === "export" ? (
                    <ExportPreviewPanel title={activeChapterTitle} />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        overflow: "hidden",
                        background: "var(--bg-primary)",
                      }}
                    >
                      {/* Re-using Editor for read-only or secondary edit */}
                      <Editor
                        initialTitle={
                          chapters.find((c) => c.id === rightPanelContent.id)
                            ?.title
                        }
                        initialContent=""
                      />
                    </div>
                  )}
                </Suspense>
              </div>
            );

            if (!isSplitView) {
              return mainPane;
            }

            const splitter = (
              <div
                className="w-px bg-white/5 cursor-col-resize relative flex-none flex items-center justify-center z-50 hover:bg-accent/50 hover:w-1 transition-all"
                onMouseDown={startResizeSplit}
                role="separator"
                aria-orientation="vertical"
              />
            );

            return splitSide === "right" ? (
              <>
                {mainPane}
                {splitter}
                {secondaryPane}
              </>
            ) : (
              <>
                {secondaryPane}
                {splitter}
                {mainPane}
              </>
            );
          })()}
        </div>
  );

  return (
    <>
      {uiMode === 'docs' ? (
            <GoogleDocsLayout
                sidebar={
                  <DocsSidebar
                    chapters={chapters}
                    activeChapterId={activeChapterId ?? undefined}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                  />
                }
                activeChapterId={activeChapterId ?? undefined}
                currentProjectId={currentProject?.id}
                editor={docEditor}
                onOpenSettings={() => setIsSettingsOpen(true)}
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
    </>
  );
}
