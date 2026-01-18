import { useState, useCallback, useEffect } from "react";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/sidebar/Sidebar";
import Editor from "./components/editor/Editor";
import ContextPanel from "./components/context/ContextPanel";
import SettingsModal from "./components/settings/SettingsModal";
import ProjectTemplateSelector from "./components/layout/ProjectTemplateSelector";
import ResearchPanel from "./components/research/ResearchPanel";
import styles from "./styles/App.module.css";
import { useProjectStore } from "./stores/projectStore";
import { useChapterStore } from "./stores/chapterStore";

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
  }
}

type ViewState = "template" | "editor";
type ContextTab = "synopsis" | "characters" | "terms";

export default function App() {
  const [view, setView] = useState<ViewState>("template");
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
    async (templateId: string) => {
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

      await createProject(projectTitle);
      const newProject = projects[0];

      if (newProject) {
        setCurrentProject(newProject);
        setView("editor");

        try {
          if (window.electron && window.electron.ipcRenderer) {
            window.electron.ipcRenderer.invoke("window:maximize");
          }
        } catch (e) {
          console.error("Failed to maximize window:", e);
        }
      }
    },
    [createProject, projects, setCurrentProject],
  );

  const handleSelectChapter = useCallback((id: string) => {
    setActiveChapterId(id);
  }, []);

  const handleSelectResearchItem = useCallback(
    (type: "character" | "world" | "scrap") => {
      setIsSplitView(true);
      const tabMap = {
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

      if (activeChapterId) {
        await updateChapter(activeChapterId, { content: newContent });
      }
    },
    [activeChapterId, updateChapter],
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
    return <ProjectTemplateSelector onSelectProject={handleSelectProject} />;
  }

  return (
    <>
      <MainLayout
        sidebar={
          <Sidebar
            chapters={chapters}
            activeChapterId={activeChapterId}
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
        <div className={styles.splitContainer}>
          <div className={styles.editorPane}>
            <Editor
              initialTitle={activeChapterTitle}
              initialContent={content}
              onSave={handleSave}
            />
          </div>

          {isSplitView && (
            <div className={styles.splitContainer}>
              <ResearchPanel
                activeTab={researchTab}
                onClose={() => setIsSplitView(false)}
              />
            </div>
          )}
        </div>
      </MainLayout>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
