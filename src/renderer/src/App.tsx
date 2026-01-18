import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import ResizableSplitPane from "./components/layout/ResizableSplitPane";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/sidebar/Sidebar";
import Editor from "./components/editor/Editor";
import CorkboardView from "./components/view/CorkboardView";
import OutlinerView from "./components/view/OutlinerView";
import ContextPanel from "./components/context/ContextPanel";
import ProjectTemplateSelector from "./components/layout/ProjectTemplateSelector";
import styles from "./styles/App.module.css";
import { useProjectStore } from "./stores/projectStore";
import { useChapterStore } from "./stores/chapterStore";

const SettingsModal = lazy(() => import("./components/settings/SettingsModal"));
const ResearchPanel = lazy(() => import("./components/research/ResearchPanel"));

type ViewState = "template" | "editor" | "corkboard" | "outliner";
type ContextTab = "synopsis" | "characters" | "terms";

export default function App() {
  const [view, setView] = useState<ViewState>("template");
  const [editorViewMode, setEditorViewMode] = useState<
    "editor" | "corkboard" | "outliner"
  >("editor");
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [researchTab, setResearchTab] = useState<
    "character" | "world" | "scrap"
  >("character");
  const [contextTab, setContextTab] = useState<ContextTab>("synopsis");
  const [content, setContent] = useState("");

  const {
    projects,
    currentProject,
    loadProjects,
    createProject,
    setCurrentProject,
  } = useProjectStore();
  const { chapters, loadChapters, updateChapter, createChapter } =
    useChapterStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (currentProject) {
      loadChapters(currentProject.id);
    }
  }, [currentProject, loadChapters]);

  const handleSelectProject = useCallback(
    async (templateId: string, projectPath: string) => {
      let projectTitle = "Untitled Project";

      switch (templateId) {
        case "blank":
          projectTitle = "New Project";
          break;
        case "novel_basic":
          projectTitle = "Web Novel";
          break;
        case "script_basic":
          projectTitle = "Screenplay";
          break;
        case "essay":
          projectTitle = "Essay";
          break;
      }

      // 프로젝트 경로와 설명 추가
      const description = `Created with ${templateId} template`;

      const newProject = await createProject(projectTitle, description, projectPath);

      if (newProject) {
        // 실제 파일 저장 (.luie/.md/.txt)
        try {
          const lower = projectPath.toLowerCase();
          const isMarkdown = lower.endsWith(".md");
          const isText = lower.endsWith(".txt");

          const content = isMarkdown
            ? `# ${newProject.title}\n\n## Chapter 1\n\n`
            : isText
              ? `${newProject.title}\n\n`
              : JSON.stringify(
                  {
                    format: "luie",
                    version: 1,
                    projectId: newProject.id,
                    title: newProject.title,
                    templateId,
                    createdAt: newProject.createdAt,
                    updatedAt: newProject.updatedAt,
                  },
                  null,
                  2,
                );

          await window.api.fs.writeFile(projectPath, content);
        } catch (e) {
          console.error("Failed to save project file:", e);
        }

        setCurrentProject(newProject);
        setView("editor");

        try {
          // macOS에서 원하는 'Space로 넘어가는' 네이티브 fullscreen
          await window.api.window.toggleFullscreen();
        } catch (e) {
          console.error("Failed to maximize window:", e);
        }
      }
    },
    [createProject, setCurrentProject],
  );

  const handleOpenExistingProject = useCallback(
    (project: (typeof projects)[number]) => {
      setCurrentProject(project);
      setView("editor");
    },
    [setCurrentProject],
  );

  const handleSelectChapter = useCallback((id: string) => {
    setActiveChapterId(id);
  }, []);

  const handleSelectResearchItem = useCallback(
    (type: "character" | "world" | "scrap") => {
      setIsSplitView(true);
      const tabMap: Record<string, "character" | "world" | "scrap"> = {
        character: "character",
        world: "world",
        scrap: "scrap",
      };
      setResearchTab(tabMap[type]);
    },
    [],
  );


  const handleSave = useCallback(
    async (title: string, newContent: string) => {
      console.log(`Saving: ${title}`);
      setContent(newContent);

      if (activeChapterId && currentProject) {
        await updateChapter(activeChapterId, title, newContent);
      }
    },
    [activeChapterId, updateChapter, currentProject],
  );

  const handleAddChapter = useCallback(async () => {
    if (!currentProject) {
      console.error("No project selected");
      return;
    }

    await createChapter(currentProject.id, `Chapter ${chapters.length + 1}`);
  }, [currentProject, createChapter, chapters.length]);

  const activeChapterTitle =
    chapters.find((c) => c.id === activeChapterId)?.title || "";

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
            onSelectChapter={handleSelectChapter}
            onAddChapter={handleAddChapter}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSelectResearchItem={handleSelectResearchItem}
          />
        }
        contextPanel={
          <ContextPanel activeTab={contextTab} onTabChange={setContextTab} />
        }
      >
        <ResizableSplitPane
          isRightVisible={isSplitView}
          onCloseRight={() => setIsSplitView(false)}
          left={
            <div className={styles.editorPane}>
              {editorViewMode === "corkboard" ? (
                <div>
                  <button
                    onClick={() => setEditorViewMode("editor")}
                    style={{
                      marginBottom: "8px",
                      padding: "4px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    에디터 뷰로 전환
                  </button>
                  <CorkboardView
                    chapters={chapters}
                    activeChapterId={activeChapterId ?? undefined}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                  />
                </div>
              ) : editorViewMode === "outliner" ? (
                <div>
                  <button
                    onClick={() => setEditorViewMode("editor")}
                    style={{
                      marginBottom: "8px",
                      padding: "4px 12px",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    에디터 뷰로 전환
                  </button>
                  <OutlinerView
                    chapters={chapters}
                    activeChapterId={activeChapterId ?? undefined}
                    onSelectChapter={handleSelectChapter}
                    onAddChapter={handleAddChapter}
                  />
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button
                      onClick={() => setEditorViewMode("corkboard")}
                      style={{ padding: "4px 12px", fontSize: "12px", cursor: "pointer" }}
                    >
                      코르크보드
                    </button>
                    <button
                      onClick={() => setEditorViewMode("outliner")}
                      style={{ padding: "4px 12px", fontSize: "12px", cursor: "pointer" }}
                    >
                      아웃라이너
                    </button>
                  </div>
                  <Editor
                    initialTitle={activeChapterTitle}
                    initialContent={content}
                    onSave={handleSave}
                  />
                </div>
              )}
            </div>
          }
          right={
            <Suspense fallback={<div style={{padding: 20}}>Loading...</div>}>
              <ResearchPanel
                activeTab={researchTab}
                onClose={() => setIsSplitView(false)}
              />
            </Suspense>
          }
        />
      </MainLayout>

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal onClose={() => setIsSettingsOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
