import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import MainLayout from "./components/layout/MainLayout";
import Sidebar from "./components/sidebar/Sidebar";
import Editor from "./components/editor/Editor";
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
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);
  const [rightPanelContent, setRightPanelContent] = useState<{
    type: "research" | "editor";
    id?: string; // chapterId
    tab?: "character" | "world" | "scrap";
  }>({ type: "research", tab: "character" });
  
  const [contextTab, setContextTab] = useState<ContextTab>("synopsis");
  const [content, setContent] = useState("");
  const [splitRatio, setSplitRatio] = useState(0.62);

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
      setRightPanelContent({ type: "research", tab: tabMap[type] });
    },
    [],
  );

  const handleSplitView = useCallback((type: 'vertical' | 'horizontal', contentId: string) => {
    // Currently only supporting vertical split (side-by-side)
    if (type === 'vertical') {
      setIsSplitView(true);
      // Check if contentId is a chapter or research
      // For now, assuming generic chapters are passed for "Open Right"
      setRightPanelContent({ type: "editor", id: contentId });
    }
  }, []);

  const startResizeSplit = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const startX = e.clientX;
      const startRatio = splitRatio;
      const container = document.querySelector(`.${styles.splitContainer}`);
      const containerWidth =
        container instanceof HTMLElement ? container.getBoundingClientRect().width : window.innerWidth;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const next = Math.min(0.8, Math.max(0.2, startRatio + delta / containerWidth));
        setSplitRatio(next);
      };
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [splitRatio],
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
            onSplitView={handleSplitView}
          />
        }
        contextPanel={
          <ContextPanel activeTab={contextTab} onTabChange={setContextTab} />
        }
      >
        <div className={styles.splitContainer}>
          <div className={styles.editorPane} style={{ flex: splitRatio }}>
            <Editor
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
              <div className={styles.researchPane} style={{ flex: 1 - splitRatio }}>
            <Suspense fallback={<div style={{padding: 20}}>Loading...</div>}>
              {rightPanelContent.type === 'research' ? (
                <ResearchPanel
                  activeTab={rightPanelContent.tab || "character"}
                  onClose={() => setIsSplitView(false)}
                />
              ) : (
                <div style={{height: '100%', overflow: 'hidden', background: 'var(--bg-primary)'}}>
                   {/* Re-using Editor for read-only or secondary edit */}
                   <Editor
                     initialTitle={chapters.find(c => c.id === rightPanelContent.id)?.title}
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
