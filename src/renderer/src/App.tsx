import { useState, lazy, Suspense, useCallback } from "react";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/sidebar/Sidebar";
import Editor from "./components/editor/Editor";
import ContextPanel from "./components/context/ContextPanel";
import ProjectTemplateSelector from "./components/layout/ProjectTemplateSelector";
import styles from "./styles/App.module.css";
import { useProjectStore } from "./stores/projectStore";
import { useUIStore } from "./stores/uiStore";
import { useProjectInit } from "./hooks/useProjectInit";
import { useFileImport } from "./hooks/useFileImport";
import { useChapterManagement } from "./hooks/useChapterManagement";
import { useSplitView } from "./hooks/useSplitView";
import { useProjectTemplate } from "./hooks/useProjectTemplate";

const SettingsModal = lazy(() => import("./components/settings/SettingsModal"));
const ResearchPanel = lazy(() => import("./components/research/ResearchPanel"));

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { view } = useUIStore();
  const { items: projects } = useProjectStore();

  // 커스텀 훅으로 로직 분리
  const { currentProject } = useProjectInit();
  
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
    (id: string) => handleSelectChapter(id)
  );

  useFileImport(currentProject);

  const { setCurrentProject } = useProjectStore();
  const { setView } = useUIStore();

  const handleOpenExistingProject = useCallback(
    (project: (typeof projects)[number]) => {
      setCurrentProject(project);
      setView("editor");
    },
    [setCurrentProject, setView],
  );

  if (view === "template") {
    return (
      <ProjectTemplateSelector
        onSelectProject={handleSelectProject}
        projects={projects}
        onOpenProject={handleOpenExistingProject}
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
            onSelectChapter={handleSelectChapter}
            onAddChapter={handleAddChapter}
            onRenameChapter={handleRenameChapter}
            onDuplicateChapter={handleDuplicateChapter}
            onDeleteChapter={handleDeleteChapter}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectResearchItem={handleSelectResearchItem}
            onSplitView={handleSplitView}
          />
        }
        contextPanel={
          <ContextPanel activeTab={contextTab} onTabChange={setContextTab} />
        }
      >
        <div className={styles.splitContainer}>
          <div
            className={styles.editorPane}
            style={{ flex: isSplitView ? splitRatio : 1 }}
          >
            <Editor
              key={activeChapterId ?? "main-editor"}
              initialTitle={activeChapterTitle}
              initialContent={content}
              onSave={handleSave}
            />
          </div>

          {isSplitView && (
            <>
              <div
                className={styles.splitDivider}
                onMouseDown={startResizeSplit}
                role="separator"
                aria-orientation="vertical"
              />
              <div
                className={styles.researchPane}
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
