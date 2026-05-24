import {
  type ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  lazy,
} from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import Ribbon from "@renderer/features/editor/components/Ribbon";
import InspectorPanel from "@renderer/features/editor/components/InspectorPanel";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import { useEditorStatsStore } from "@renderer/features/editor/stores/editorStatsStore";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import WikiDetailView from "@renderer/features/research/components/wiki/WikiDetailView";
import EventDetailView from "@renderer/features/research/components/event/EventDetailView";
import FactionDetailView from "@renderer/features/research/components/faction/FactionDetailView";
import WorldSection from "@renderer/features/research/components/WorldSection";
import { CanvasPane } from "@renderer/features/canvas";
import MemoMainView from "@renderer/features/research/components/memo/MemoMainView";
import AnalysisSection from "@renderer/features/research/components/AnalysisSection";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { Menu, ChevronRight } from "lucide-react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type GroupImperativeHandle,
  type Layout,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import {
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  getResponsivePanelSize,
  toPanelPercentSize,
} from "@shared/constants/layoutSizing";
import { toPercentSize } from "@shared/constants/sidebarSizing";
import {
  getPanelLayoutValue,
  useLayoutPersist,
} from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  groupLayoutMatchesPanels,
} from "@renderer/features/workspace/utils/panelGroupLayout";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";

import type { Tab } from "@renderer/features/workspace/components/panels/ContextPanel";

const ContextPanel = lazy(
  () => import("@renderer/features/workspace/components/panels/ContextPanel")
);

interface ScrivenerLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
  onCloseCanvas?: () => void;
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
  onCloseCanvas,
  additionalPanels,
}: ScrivenerLayoutProps) {
  const { t } = useTranslation();
  const [contextTab, setContextTab] = useState<Tab>("synopsis");
  const {
    mainView,
    panels,
    layoutSurfaceRatios,
    isSidebarOpen,
    isInspectorOpen,
    setRegionOpen,
    updatePanelSize,
  } = useUIStore(
    useShallow((state) => ({
      mainView: state.mainView,
      panels: state.panels,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      isSidebarOpen: state.regions.leftSidebar.open,
      isInspectorOpen: state.regions.rightPanel.open,
      setRegionOpen: state.setRegionOpen,
      updatePanelSize: state.updatePanelSize,
    }))
  );
  const editorSplitGroupRef = useRef<GroupImperativeHandle | null>(null);
  const scrivenerLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const inspectorPanelRef = useRef<PanelImperativeHandle | null>(null);
  const previousPanelCountRef = useRef(panels.length);
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const maxWidth = useEditorStore((state) => state.maxWidth);
  const handleEditorSplitLayoutChanged = useCallback(
    (layout: Layout) => {
      panels.forEach((panel, panelIndex) => {
        const rawSize = getPanelLayoutValue(layout, panel.id, panelIndex + 1);
        if (typeof rawSize !== "number" || !Number.isFinite(rawSize)) return;
        updatePanelSize(panel.id, rawSize);
      });
    },
    [panels, updatePanelSize],
  );

  const { wordCount, charCount } = useEditorStatsStore(
    useShallow((state) => ({
      wordCount: state.wordCount,
      charCount: state.charCount,
    }))
  );

  const binderConfig = getLayoutSurfaceConfig("scrivener.binder");
  const inspectorConfig = getLayoutSurfaceConfig("scrivener.inspector");

  const onLayoutChanged = useLayoutPersist([
    { id: "sidebar", surface: "scrivener.binder" },
    { id: "inspector", surface: "scrivener.inspector" },
  ]);

  const binderRatio =
    layoutSurfaceRatios["scrivener.binder"] ||
    getLayoutSurfaceDefaultRatio("scrivener.binder");
  const inspectorRatio =
    layoutSurfaceRatios["scrivener.inspector"] ||
    getLayoutSurfaceDefaultRatio("scrivener.inspector");
  const {
    isClosing: isSidebarClosing,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: toPanelPercentSize(binderRatio),
    panelRef: sidebarPanelRef,
  });
  const {
    isClosing: isInspectorClosing,
    shouldRender: shouldRenderInspector,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isInspectorOpen,
    openSize: toPanelPercentSize(inspectorRatio),
    panelRef: inspectorPanelRef,
  });
  const scrivenerLayoutGroupWidth = useElementWidth(scrivenerLayoutGroupRef);
  const binderSize = getResponsivePanelSize(
    scrivenerLayoutGroupWidth,
    binderConfig,
  );
  const inspectorSize = getResponsivePanelSize(
    scrivenerLayoutGroupWidth,
    inspectorConfig,
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
      case "canvas":
        return <CanvasPane />;
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
          isCanvasMode={mainView.type === "canvas"}
          onCloseCanvas={onCloseCanvas}
        />
        {/* Scrivener-specific toolbar items could go here if separate */}
      </div>

      {/* 3. Main 3-Pane Body using react-resizable-panels entirely */}
      <div className="flex-1 flex overflow-hidden relative">
        <PanelGroup
          orientation="horizontal"
          className="flex w-full h-full flex-1 overflow-hidden relative"
          id="scrivener-layout-group"
          elementRef={scrivenerLayoutGroupRef}
          onLayoutChanged={onLayoutChanged}
        >

          {/* Pane 1: Binder (Sidebar) */}
          {shouldRenderSidebar && (
            <>
              <Panel
                id="sidebar"
                panelRef={sidebarPanelRef}
                collapsible
                collapsedSize={0}
                data-panel-animated="true"
                defaultSize={toPanelPercentSize(binderRatio)}
                minSize={binderSize.minSize}
                maxSize={binderSize.maxSize}
                className={`bg-panel border-r border-border flex flex-col shrink-0 min-w-0 overflow-hidden ${enableAnimations
                  ? isSidebarClosing
                    ? "animate-out slide-out-to-left fade-out duration-200"
                    : "animate-in slide-in-from-left fade-in duration-200"
                  : ""
                  }`}
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle data-separator-feature="scrivener.binder" className={`w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative ${enableAnimations && isSidebarClosing
                ? "opacity-0 transition-opacity duration-200"
                : ""
                }`}>
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          {/* Pane 2: Editor (Center) */}
          <Panel
            id="main-editor"
            minSize={toPercentSize(30)}
            className="min-w-0 bg-canvas flex flex-col relative z-0"
          >
            {/* Header / Title Bar of Editor Pane? (Like Scrivener Header) */}
            <div className="h-8 bg-surface border-b border-border flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Floating Sidebar Toggle when closed */}
                {!shouldRenderSidebar && (
                  <button
                    onClick={() => setRegionOpen("leftSidebar", true)}
                    className="p-1 rounded hover:bg-muted/40 text-muted-foreground transition-colors mr-2 shrink-0"
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
                {!shouldRenderInspector && (
                  <button
                    onClick={() => setRegionOpen("rightPanel", true)}
                    className="p-1 rounded hover:bg-muted/40 text-muted-foreground transition-colors shrink-0"
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
                orientation="horizontal"
                className="flex w-full h-full flex-1 overflow-hidden relative"
                groupRef={editorSplitGroupRef}
                id="scrivener-editor-split-group"
                onLayoutChanged={handleEditorSplitLayoutChanged}
              >
                <Panel
                  id="editor-content"
                  defaultSize={toPercentSize(100)}
                  minSize={toPercentSize(20)}
                  className="min-w-0 relative flex flex-col"
                >
                  <EditorDropZones />
                  {(mainView.type === "world" || mainView.type === "analysis" || mainView.type === "canvas") ? (
                    <div className="h-full w-full bg-panel text-fg">
                      {renderMainContent()}
                    </div>
                  ) : (
                    <div
                      className="h-full w-full overflow-y-scroll custom-scrollbar p-8 bg-panel text-fg"
                      data-editor-scroll-container="true"
                    >
                      <div
                        className="mx-auto min-h-[500px] w-full"
                        style={{ maxWidth: `${maxWidth ?? 800}px` }}
                      >
                        {renderMainContent()}
                      </div>
                    </div>
                  )}
                </Panel>
                {additionalPanels}
                {panels.length === 0 && (
                  <Panel
                    id="scrivener-editor-placeholder"
                    defaultSize={0}
                    minSize={0}
                    maxSize={0}
                    className="pointer-events-none overflow-hidden opacity-0"
                  />
                )}
              </PanelGroup>
            </div>

            {/* Scrivener Info Line */}
            <div className="h-6 bg-surface border-t border-border flex items-center px-3 text-xs text-muted shrink-0">
              <span>
                {t("editor.status.charLabel")} {charCount}
                {t("editor.status.separator")}
                {t("editor.status.wordLabel")} {wordCount}
              </span>
            </div>
          </Panel>

          {/* Pane 3: Inspector (Right) */}
          {shouldRenderInspector && (
            <>
              <PanelResizeHandle data-separator-feature="scrivener.inspector" className={`w-1 shrink-0 bg-border/40 hover:bg-accent focus-visible:bg-accent transition-colors cursor-col-resize z-10 relative ${enableAnimations && isInspectorClosing
                ? "opacity-0 transition-opacity duration-200"
                : ""
                }`}>
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>

              <Panel
                id="inspector"
                panelRef={inspectorPanelRef}
                collapsible
                collapsedSize={0}
                data-panel-animated="true"
                defaultSize={toPanelPercentSize(inspectorRatio)}
                minSize={inspectorSize.minSize}
                maxSize={inspectorSize.maxSize}
                className={`bg-panel flex flex-col shrink-0 min-w-0 overflow-hidden ${enableAnimations
                  ? isInspectorClosing
                    ? "animate-out slide-out-to-right fade-out duration-200"
                    : "animate-in slide-in-from-right fade-in duration-200"
                  : ""
                  }`}
              >
                {/* Floating Toggle wrapper */}
                <div className="flex items-center justify-between border-b border-border bg-surface px-2 shadow-sm min-h-[32px] shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted ml-2">{t("scrivener.inspector.title")}</span>
                  <button
                    onClick={() => setRegionOpen("rightPanel", false)}
                    className="p-1.5 rounded hover:bg-muted/40 text-muted-foreground transition-colors"
                    title={t("scrivener.inspector.close")}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  <Suspense fallback={<div className="p-4 text-xs">{t("scrivener.inspector.loading")}</div>}>
                    {mainView.type === "canvas" ? (
                      <ContextPanel
                        activeTab={contextTab}
                        onTabChange={setContextTab}
                        isCanvasMode={true}
                      />
                    ) : (
                      <InspectorPanel key={activeChapterId} activeChapterId={activeChapterId} />
                    )}
                  </Suspense>
                </div>
              </Panel>
            </>
          )}

          {!shouldRenderSidebar && !shouldRenderInspector && (
            <Panel
              id="scrivener-layout-placeholder"
              defaultSize={0}
              minSize={0}
              maxSize={0}
              className="pointer-events-none overflow-hidden opacity-0"
            />
          )}

        </PanelGroup>
      </div>
    </div>
  );
}
