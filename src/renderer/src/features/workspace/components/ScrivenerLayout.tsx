import {
  type ReactNode,
  useState,
  Suspense,
  useCallback
} from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import Ribbon from "@renderer/features/editor/components/Ribbon";
import InspectorPanel from "@renderer/features/editor/components/InspectorPanel";
import { Menu, ChevronRight } from "lucide-react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelSize } from "react-resizable-panels";

interface ScrivenerLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  additionalPanels?: ReactNode;
}

import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import WorldSection from "@renderer/features/research/components/WorldSection";
import MemoMainView from "@renderer/features/research/components/memo/MemoMainView";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";
import { EditorDropZones } from "@shared/ui/EditorDropZones";

export default function ScrivenerLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  editor,
  onOpenSettings,
  additionalPanels,
}: ScrivenerLayoutProps) {
  const { t } = useTranslation();
  const { mainView, sidebarWidths, setSidebarWidth } = useUIStore();

  // Layout State for visibility toggles
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const handleBinderResize = useCallback((panelSize: PanelSize) => {
    setSidebarWidth("binder", Math.round(panelSize.inPixels));
  }, [setSidebarWidth]);

  const handleInspectorResize = useCallback((panelSize: PanelSize) => {
    setSidebarWidth("inspector", Math.round(panelSize.inPixels));
  }, [setSidebarWidth]);

  const binderSavedPxWidth = sidebarWidths["binder"] || 210;

  const inspectorSavedPxWidth = sidebarWidths["inspector"] || 350;

  const renderMainContent = () => {
    switch (mainView.type) {
      case "character":
        return <WikiDetailView characterId={mainView.id} />;
      case "world":
        return <WorldSection worldId={mainView.id} />;
      case "memo":
        return <MemoMainView />;
      case "analysis":
        return <AnalysisSection />;
      case "editor":
      default:
        return children;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative border-t border-transparent">
      {/* 1. WindowBar */}
      <WindowBar title={activeChapterTitle || "Luie Scrivener Mode"} />

      {/* 2. Top Toolbar (Ribbon) - Full Width */}
      <div className="shrink-0 z-30 shadow-sm relative">
        <Ribbon
          editor={editor}
          onOpenSettings={onOpenSettings}
          activeChapterId={activeChapterId}
        />
        {/* Scrivener-specific toolbar items could go here if separate */}
      </div>

      {/* 3. Main 3-Pane Body using react-resizable-panels entirely */}
      <div className="flex-1 flex overflow-hidden relative">
        <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative" id="scrivener-layout">

          {/* Pane 1: Binder (Sidebar) */}
          {isSidebarOpen && (
            <>
              <Panel
                id="sidebar"
                defaultSize={`${binderSavedPxWidth}px`}
                minSize="220px"
                maxSize="440px"
                onResize={handleBinderResize}
                className="bg-panel border-r border-border flex flex-col shrink-0 min-w-0"
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          {/* Pane 2: Editor (Center) */}
          <Panel id="main-editor" minSize={30} className="min-w-0 bg-canvas flex flex-col relative z-0">
            {/* Header / Title Bar of Editor Pane? (Like Scrivener Header) */}
            <div className="h-8 bg-surface border-b border-border flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Floating Sidebar Toggle when closed */}
                {!isSidebarOpen && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-1 rounded hover:bg-surface-hover text-muted-foreground transition-colors mr-2 shrink-0"
                    title={t("sidebar.toggle.open")}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
                <span className="font-semibold text-sm truncate opacity-80">
                  {activeChapterTitle || t("project.defaults.untitled")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isInspectorOpen && (
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="p-1 rounded hover:bg-surface-hover text-muted-foreground transition-colors shrink-0"
                    title={t("scrivener.inspector.open")}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden relative flex flex-row">
              <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative">
                <Panel id="editor-content" defaultSize={100} minSize={20} className="min-w-0 relative flex flex-col">
                  <EditorDropZones />
                  {(mainView.type === "world" || mainView.type === "analysis") ? (
                    <div className="h-full w-full bg-white dark:bg-[#1e1e1e]">
                      {renderMainContent()}
                    </div>
                  ) : (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar p-8 bg-white dark:bg-[#1e1e1e]">
                      <div className="max-w-3xl mx-auto min-h-[500px]">
                        {renderMainContent()}
                      </div>
                    </div>
                  )}
                </Panel>
                {additionalPanels}
              </PanelGroup>
            </div>

            {/* Scrivener Info Line */}
            <div className="h-6 bg-surface border-t border-border flex items-center px-3 text-xs text-muted justify-between shrink-0">
              <span>{/* Word Count etc */}</span>
              <span>{t("scrivener.target", { count: 2000 })}</span>
            </div>
          </Panel>

          {/* Pane 3: Inspector (Right) */}
          {isInspectorOpen && (
            <>
              <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>

              <Panel
                id="inspector"
                defaultSize={`${inspectorSavedPxWidth}px`}
                minSize="245px"
                maxSize="400px"
                onResize={handleInspectorResize}
                className="bg-panel flex flex-col shrink-0 min-w-0"
              >
                {/* Floating Toggle wrapper */}
                <div className="flex items-center justify-between border-b border-border bg-surface px-2 shadow-sm min-h-[32px] shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted ml-2">{t("scrivener.inspector.title")}</span>
                  <button
                    onClick={() => setIsInspectorOpen(false)}
                    className="p-1.5 rounded hover:bg-surface-hover text-muted-foreground transition-colors"
                    title={t("scrivener.inspector.close")}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <Suspense fallback={<div className="p-4 text-xs">{t("scrivener.inspector.loading")}</div>}>
                    <InspectorPanel key={activeChapterId} activeChapterId={activeChapterId} />
                  </Suspense>
                </div>
              </Panel>
            </>
          )}

        </PanelGroup>
      </div>
    </div>
  );
}
