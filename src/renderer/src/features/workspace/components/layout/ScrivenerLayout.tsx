import {
  type ReactNode,
  Suspense,
  useEffect,
  useRef,
} from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import Ribbon from "@renderer/features/editor/components/Ribbon";
import InspectorPanel from "@renderer/features/editor/components/InspectorPanel";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";
import FactionDetailView from "@renderer/features/research/components/faction/FactionDetailView";
import WorldSection from "@renderer/features/research/components/WorldSection";
import MemoMainView from "@renderer/features/research/components/memo/MemoMainView";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { Menu, ChevronRight } from "lucide-react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type GroupImperativeHandle } from "react-resizable-panels";
import {
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  toPanelPercentSize,
  toPanelPixelSize,
} from "@shared/constants/layoutSizing";
import { toPercentSize } from "@shared/constants/sidebarSizing";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  buildPanelGroupCompositionKey,
  groupLayoutMatchesPanels,
} from "@renderer/features/workspace/utils/panelGroupLayout";

interface ScrivenerLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
  additionalPanels?: ReactNode;
}

export default function ScrivenerLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  editor,
  onOpenSettings,
  onOpenExport,
  onOpenWorldGraph,
  additionalPanels,
}: ScrivenerLayoutProps) {
  const { t } = useTranslation();
  const {
    mainView,
    panels,
    layoutSurfaceRatios,
    hasHydrated,
    isSidebarOpen,
    isInspectorOpen,
    setRegionOpen,
  } = useUIStore(
    useShallow((state) => ({
      mainView: state.mainView,
      panels: state.panels,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      hasHydrated: state.hasHydrated,
      isSidebarOpen: state.regions.leftSidebar.open,
      isInspectorOpen: state.regions.rightPanel.open,
      setRegionOpen: state.setRegionOpen,
    }))
  );
  const editorSplitGroupRef = useRef<GroupImperativeHandle | null>(null);
  const previousPanelCountRef = useRef(panels.length);

  const binderConfig = getLayoutSurfaceConfig("scrivener.binder");
  const inspectorConfig = getLayoutSurfaceConfig("scrivener.inspector");

  const onLayoutChanged = useLayoutPersist([
    { id: "sidebar", surface: "scrivener.binder" },
    { id: "inspector", surface: "scrivener.inspector" },
  ]);

  const binderRatio =
    layoutSurfaceRatios["scrivener.binder"] ??
    getLayoutSurfaceDefaultRatio("scrivener.binder");
  const inspectorRatio =
    layoutSurfaceRatios["scrivener.inspector"] ??
    getLayoutSurfaceDefaultRatio("scrivener.inspector");
  const scrivenerLayoutGroupKey = buildPanelGroupCompositionKey(
    `scrivener-layout-${hasHydrated ? "hydrated" : "cold"}`,
    [
      ...(isSidebarOpen ? ["sidebar"] : []),
      "main-editor",
      ...(isInspectorOpen ? ["inspector"] : []),
    ],
  );
  const scrivenerEditorSplitKey = buildPanelGroupCompositionKey(
    "scrivener-editor-split",
    ["editor-content", ...panels.map((panel) => panel.id)],
  );

  useEffect(() => {
    const previousPanelCount = previousPanelCountRef.current;
    const currentPanelCount = panels.length;
    let frameId: number | null = null;

    if (previousPanelCount === 0 && currentPanelCount === 1) {
      const firstPanelId = panels[0]?.id;
      if (firstPanelId) {
        frameId = requestAnimationFrame(() => {
          const group = editorSplitGroupRef.current;
          if (!group) {
            return;
          }
          if (!groupLayoutMatchesPanels(group, ["editor-content", firstPanelId])) {
            return;
          }

          group.setLayout({
            "editor-content": 50,
            [firstPanelId]: 50,
          });
        });
      }
    }

    previousPanelCountRef.current = currentPanelCount;

    return () => {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [panels]);

  const renderMainContent = () => {
    switch (mainView.type) {
      case "character":
        return <WikiDetailView characterId={mainView.id} />;
      case "event":
        return <EventDetailView eventId={mainView.id} />;
      case "faction":
        return <FactionDetailView factionId={mainView.id} />;
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
          onOpenExportPreview={onOpenExport}
          onOpenWorldGraph={onOpenWorldGraph}
        />
        {/* Scrivener-specific toolbar items could go here if separate */}
      </div>

      {/* 3. Main 3-Pane Body using react-resizable-panels entirely */}
      <div className="flex-1 flex overflow-hidden relative">
        <PanelGroup
          key={scrivenerLayoutGroupKey}
          orientation="horizontal"
          className="flex w-full h-full flex-1 overflow-hidden relative"
          id="scrivener-layout"
          onLayoutChanged={onLayoutChanged}
        >

          {/* Pane 1: Binder (Sidebar) */}
          {isSidebarOpen && (
            <>
              <Panel
                id="sidebar"
                defaultSize={toPanelPercentSize(binderRatio)}
                minSize={toPanelPixelSize(binderConfig.minPx)}
                maxSize={toPanelPixelSize(binderConfig.maxPx)}
                className="bg-panel border-r border-border flex flex-col shrink-0 min-w-0"
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle data-separator-feature="scrivener.binder" className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          {/* Pane 2: Editor (Center) */}
          <Panel id="main-editor" minSize={toPercentSize(30)} className="min-w-0 bg-canvas flex flex-col relative z-0">
            {/* Header / Title Bar of Editor Pane? (Like Scrivener Header) */}
            <div className="h-8 bg-surface border-b border-border flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Floating Sidebar Toggle when closed */}
                {!isSidebarOpen && (
                  <button
                    onClick={() => setRegionOpen("leftSidebar", true)}
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
                    onClick={() => setRegionOpen("rightPanel", true)}
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
              <PanelGroup
                key={scrivenerEditorSplitKey}
                orientation="horizontal"
                className="flex w-full h-full flex-1 overflow-hidden relative"
                groupRef={editorSplitGroupRef}
                id="scrivener-editor-split"
              >
                <Panel
                  id="editor-content"
                  defaultSize={toPercentSize(100)}
                  minSize={toPercentSize(20)}
                  className="min-w-0 relative flex flex-col"
                >
                  <EditorDropZones />
                  {(mainView.type === "world" || mainView.type === "analysis") ? (
                    <div className="h-full w-full bg-panel text-fg">
                      {renderMainContent()}
                    </div>
                  ) : (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar p-8 bg-panel text-fg">
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
              <PanelResizeHandle data-separator-feature="scrivener.inspector" className="w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>

              <Panel
                id="inspector"
                defaultSize={toPanelPercentSize(inspectorRatio)}
                minSize={toPanelPixelSize(inspectorConfig.minPx)}
                maxSize={toPanelPixelSize(inspectorConfig.maxPx)}
                className="bg-panel flex flex-col shrink-0 min-w-0"
              >
                {/* Floating Toggle wrapper */}
                <div className="flex items-center justify-between border-b border-border bg-surface px-2 shadow-sm min-h-[32px] shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted ml-2">{t("scrivener.inspector.title")}</span>
                  <button
                    onClick={() => setRegionOpen("rightPanel", false)}
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
