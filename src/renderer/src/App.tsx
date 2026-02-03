import { useState, lazy, Suspense, useCallback, useEffect } from "react";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/sidebar/Sidebar";
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
import {
  LUIE_PACKAGE_EXTENSION_NO_DOT,
  LUIE_PACKAGE_FILTER_NAME,
  LUIE_PACKAGE_META_FILENAME,
} from "../../shared/constants";
import { api } from "./services/api";

const SettingsModal = lazy(() => import("./components/settings/SettingsModal"));
const ResearchPanel = lazy(() => import("./components/research/ResearchPanel"));
const SnapshotViewer = lazy(() => import("./components/snapshot/SnapshotViewer"));

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { view } = useUIStore();
  const { items: projects, createProject, setCurrentProject, loadProjects } = useProjectStore();
  const { theme } = useEditorStore();

  // 커스텀 훅으로 로직 분리
  const { currentProject } = useProjectInit();

  // 전역 테마 적용 (템플릿/에디터 등 모든 뷰에서 동작)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  
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

  const {
    isSplitView,
    splitRatio,
    rightPanelContent,
    contextTab,
    setContextTab,
    setSplitView,
    handleSelectResearchItem,
    handleSplitView,
    startResizeSplit,
  } = useSplitView();

  const { handleSelectProject } = useProjectTemplate(
    (id: string) => {
      handleSelectChapter(id);
      // Force fullscreen on new project
      api.window.setFullscreen(true).catch((err) => {
        api.logger.error("Failed to set fullscreen", err);
      });
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
      // Force fullscreen on project open
      api.window.setFullscreen(true).catch((err) => {
        api.logger.error("Failed to set fullscreen", err);
      });
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
      const fileName = selectedPath.split(/[/\\]/).pop() ?? "Untitled";
      let projectTitle = fileName.replace(/\.luie$/i, "");

      const metaResult = await api.fs.readLuieEntry(selectedPath, LUIE_PACKAGE_META_FILENAME);
      if (metaResult.success && metaResult.data) {
        try {
          const parsed = JSON.parse(metaResult.data) as { title?: string };
          if (typeof parsed.title === "string" && parsed.title.trim().length > 0) {
            projectTitle = parsed.title.trim();
          }
        } catch (error) {
          api.logger.warn("Failed to parse luie meta", error);
        }
      }

      const created = await createProject(projectTitle, undefined, selectedPath);
      if (created) {
        setCurrentProject(created);
        setView("editor");
        api.window.setFullscreen(true).catch((err) => {
          api.logger.error("Failed to set fullscreen", err);
        });
      }
    } catch (error) {
      api.logger.error("Failed to open luie file", error);
    }
  }, [createProject, setCurrentProject, setView]);

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
        api.window.setFullscreen(true).catch((err) => {
          api.logger.error("Failed to set fullscreen", err);
        });
      }
    } catch (error) {
      api.logger.error("Failed to import snapshot backup", error);
    }
  }, [loadProjects, setCurrentProject, setView]);

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

  return (
    <>
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
        <div id="split-view-container" className="flex w-full h-full flex-1 overflow-hidden relative">
          <div
            className="h-full overflow-hidden relative min-w-0 bg-canvas"
            style={{ flex: isSplitView ? splitRatio : 1 }}
          >
            <Editor
              key={activeChapterId ?? "main-editor"}
              initialTitle={activeChapterTitle}
              initialContent={content}
              onSave={handleSave}
              comparisonContent={
                rightPanelContent.type === "snapshot" 
                  ? rightPanelContent.snapshot?.content 
                  : undefined
              }
              diffMode={rightPanelContent.type === "snapshot" ? "current" : undefined}
            />
          </div>

          {isSplitView && (
            <>
              {/* Splitter */}
              <div
                className="w-px bg-white/5 cursor-col-resize relative flex-none flex items-center justify-center z-50 hover:bg-accent/50 hover:w-1 transition-all"
                onMouseDown={startResizeSplit}
                role="separator"
                aria-orientation="vertical"
              />
              
              <div
                className="h-full overflow-hidden relative min-w-0 bg-panel"
                style={{ flex: 1 - splitRatio }}
              >
                <Suspense
                  fallback={<div style={{ padding: 20 }}>Loading...</div>}
                >
                    {rightPanelContent.type === "research" ? (
                      <ResearchPanel
                        activeTab={rightPanelContent.tab || "character"}
                        onClose={() => setSplitView(false)}
                      />
                    ) : rightPanelContent.type === "snapshot" &&
                      rightPanelContent.snapshot ? (
                      <SnapshotViewer 
                        snapshot={rightPanelContent.snapshot} 
                        currentContent={chapters.find(c => c.projectId === currentProject?.id && c.id === rightPanelContent.snapshot?.chapterId)?.content || ""}
                          onApplySnapshotText={async (nextContent) => {
                            if (!activeChapterId) return;
                            await handleSave(activeChapterTitle, nextContent);
                          }}
                      />
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
                          initialContent="" // We'd need to fetch content. For now placeholder.
                          // In real app, Editor should fetch by ID or we pass content
                        />
                      </div>
                    )}
                </Suspense>
              </div>
            </>
          )}
        </div>
      </MainLayout>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
