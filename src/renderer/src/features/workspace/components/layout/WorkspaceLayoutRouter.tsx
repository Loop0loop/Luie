import { Suspense, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import type { EditorUiMode } from "@shared/types";
import type { MainView, ResearchTab } from "@renderer/features/workspace/stores/uiStore";
import {
  CanvasActivityShell,
  CanvasPane,
  DocsSidebar,
  EditorLayout,
  GoogleDocsLayout,
  layoutFallback,
  MainLayout,
  ScrivenerLayout,
  ScrivenerSidebar,
  Sidebar,
} from "./rootShell";

type WorkspaceLayoutRouterProps = {
  uiMode: EditorUiMode;
  mainViewType: MainView["type"];
  editor: Editor | null;
  sharedEditor: ReactNode;
  additionalPanels: ReactNode;
  additionalPanelIds: string[];
  activeChapterId?: string;
  activeChapterTitle?: string;
  currentProjectId?: string;
  isResearchPanelAdjacent: boolean;
  isEditorPanelAdjacent?: boolean;
  isDocsMobileView?: boolean;
  onToggleDocsMobileView?: () => void;
  onOpenSettings: () => void;
  onPrefetchSettings: () => void;
  onSelectResearchItem: (tab: ResearchTab) => void;
  onSplitView: (type: "vertical" | "horizontal", contentId: string) => void;
  onRenameChapter: (id: string, title: string) => Promise<void>;
  onSaveChapter: (title: string, content: string, chapterId?: string) => Promise<void>;
  onOpenExport: () => void;
  onOpenWorldGraph: () => void;
  onCloseCanvas: () => void;
};

/** 모드별 화면 조립만 담당한다. 프로젝트·단축키·저장 상태는 EditorRoot에 남긴다. */
export function WorkspaceLayoutRouter({
  uiMode,
  mainViewType,
  editor,
  sharedEditor,
  additionalPanels,
  additionalPanelIds,
  activeChapterId,
  activeChapterTitle,
  currentProjectId,
  isResearchPanelAdjacent,
  isEditorPanelAdjacent = false,
  isDocsMobileView = false,
  onToggleDocsMobileView,
  onOpenSettings,
  onPrefetchSettings,
  onSelectResearchItem,
  onSplitView,
  onRenameChapter,
  onSaveChapter,
  onOpenExport,
  onOpenWorldGraph,
  onCloseCanvas,
}: WorkspaceLayoutRouterProps) {
  if (uiMode === "docs" && mainViewType !== "canvas") {
    return (
      <GoogleDocsLayout
        sidebar={<Suspense fallback={null}><DocsSidebar /></Suspense>}
        activeChapterId={activeChapterId}
        activeChapterTitle={activeChapterTitle}
        currentProjectId={currentProjectId}
        editor={editor}
        onOpenSettings={onOpenSettings}
        onRenameChapter={onRenameChapter}
        onSaveChapter={onSaveChapter}
        onOpenExport={onOpenExport}
        onOpenWorldGraph={onOpenWorldGraph}
        additionalPanels={additionalPanels}
        additionalPanelIds={additionalPanelIds}
        isMobileView={isDocsMobileView}
        onToggleMobileView={onToggleDocsMobileView}
      >
        {sharedEditor}
      </GoogleDocsLayout>
    );
  }

  if (uiMode === "editor" && mainViewType !== "canvas") {
    return (
      <EditorLayout
        sidebar={<Suspense fallback={null}><DocsSidebar /></Suspense>}
        activeChapterId={activeChapterId}
        activeChapterTitle={activeChapterTitle}
        currentProjectId={currentProjectId}
        editor={editor}
        onOpenSettings={onOpenSettings}
        onOpenExport={onOpenExport}
        onOpenWorldGraph={onOpenWorldGraph}
        additionalPanels={additionalPanels}
        additionalPanelIds={additionalPanelIds}
      >
        {sharedEditor}
      </EditorLayout>
    );
  }

  if (uiMode === "scrivener" && mainViewType !== "canvas") {
    return (
      <ScrivenerLayout
        sidebar={<Suspense fallback={null}><ScrivenerSidebar /></Suspense>}
        activeChapterId={activeChapterId}
        activeChapterTitle={activeChapterTitle}
        editor={editor}
        onOpenSettings={onOpenSettings}
        onOpenExport={onOpenExport}
        onOpenWorldGraph={onOpenWorldGraph}
        onCloseCanvas={onCloseCanvas}
        additionalPanels={additionalPanels}
      >
        {sharedEditor}
      </ScrivenerLayout>
    );
  }

  return (
    <MainLayout
      sidebar={
        <Suspense fallback={null}>
          {mainViewType === "canvas" ? (
            <CanvasActivityShell onClose={onCloseCanvas} />
          ) : (
            <Sidebar
              onOpenSettings={onOpenSettings}
              onPrefetchSettings={onPrefetchSettings}
              onSelectResearchItem={onSelectResearchItem}
              onSplitView={onSplitView}
            />
          )}
        </Suspense>
      }
      isCanvasMode={mainViewType === "canvas"}
      onCloseCanvas={onCloseCanvas}
      additionalPanels={additionalPanels}
      additionalPanelIds={additionalPanelIds}
      isResearchPanelAdjacent={isResearchPanelAdjacent}
      isEditorPanelAdjacent={isEditorPanelAdjacent}
    >
      {mainViewType === "canvas" ? (
        <Suspense fallback={layoutFallback}><CanvasPane /></Suspense>
      ) : (
        sharedEditor
      )}
    </MainLayout>
  );
}
