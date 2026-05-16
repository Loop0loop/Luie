import { type ReactNode, useCallback, useState, useEffect, useRef } from "react";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import {
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
} from "lucide-react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type Layout,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import StatusFooter from "@shared/ui/StatusFooter";
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
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  onOpenExport?: () => void;
  isCanvasMode?: boolean;
  onCloseCanvas?: () => void;
}

export default function MainLayout({
  children,
  sidebar,
  contextPanel,
  additionalPanels,
  additionalPanelIds = [],
  onOpenExport,
  isCanvasMode = false,
  onCloseCanvas,
}: MainLayoutProps) {
  const { t } = useTranslation();
  const {
    isSidebarOpen,
    isContextOpen,
    layoutSurfaceRatios,
    toggleLeftSidebar,
    setRegionOpen,
    updatePanelSize,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      isContextOpen: state.regions.rightPanel.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      toggleLeftSidebar: state.toggleLeftSidebar,
      setRegionOpen: state.setRegionOpen,
      updatePanelSize: state.updatePanelSize,
    })),
  );

  const mainSidebarConfig = getLayoutSurfaceConfig("default.sidebar");
  const mainContextConfig = getLayoutSurfaceConfig("default.panel");
  const mainLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const contextPanelRef = useRef<PanelImperativeHandle | null>(null);
  const mainLayoutGroupWidth = useElementWidth(mainLayoutGroupRef);
  const mainSidebarSize = getResponsivePanelSize(
    mainLayoutGroupWidth,
    mainSidebarConfig,
  );
  const mainContextSize = getResponsivePanelSize(
    mainLayoutGroupWidth,
    mainContextConfig,
  );

  const onLayoutChanged = useLayoutPersist([
    { id: "sidebar-panel", surface: "default.sidebar" },
    { id: "context-panel", surface: "default.panel" },
  ]);
  const onContentLayoutChanged = useCallback(
    (layout: Layout) => {
      additionalPanelIds.forEach((panelId, panelIndex) => {
        const rawSize = getPanelLayoutValue(layout, panelId, panelIndex + 1);
        if (typeof rawSize !== "number" || !Number.isFinite(rawSize)) return;
        updatePanelSize(panelId, rawSize);
      });
    },
    [additionalPanelIds, updatePanelSize],
  );

  const enableAnimations = useEditorStore((state) => state.enableAnimations);

  const sidebarRatio =
    layoutSurfaceRatios["default.sidebar"] ||
    getLayoutSurfaceDefaultRatio("default.sidebar");
  const contextRatio =
    layoutSurfaceRatios["default.panel"] ||
    getLayoutSurfaceDefaultRatio("default.panel");

  const [sidebarDefaultSize, setSidebarDefaultSize] = useState(() =>
    toPanelPercentSize(sidebarRatio),
  );
  const [contextDefaultSize, setContextDefaultSize] = useState(() =>
    toPanelPercentSize(contextRatio),
  );
  const {
    isClosing: isSidebarClosing,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: sidebarDefaultSize,
    panelRef: sidebarPanelRef,
  });
  const {
    isClosing: isContextClosing,
    shouldRender: shouldRenderContext,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isContextOpen,
    openSize: contextDefaultSize,
    panelRef: contextPanelRef,
  });

  useEffect(() => {
    if (shouldRenderSidebar) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarDefaultSize(toPanelPercentSize(sidebarRatio));
  }, [shouldRenderSidebar, sidebarRatio]);

  useEffect(() => {
    if (shouldRenderContext) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContextDefaultSize(toPanelPercentSize(contextRatio));
  }, [shouldRenderContext, contextRatio]);

  return (
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />

      <div className="relative min-h-0 flex-1">
        <PanelGroup
          id="main-layout-group"
          orientation="horizontal"
          className="flex flex-1 overflow-hidden relative w-full h-full"
          elementRef={mainLayoutGroupRef}
          onLayoutChanged={onLayoutChanged}
        >
        {/* Sidebar */}
        {shouldRenderSidebar && (
          <Panel
            id="sidebar-panel"
            panelRef={sidebarPanelRef}
            collapsible
            collapsedSize={0}
            onResize={(panelSize) => {
              const isCollapsed =
                panelSize.asPercentage <= 0.1 || panelSize.inPixels <= 1;
              if (isCollapsed) {
                setRegionOpen("leftSidebar", false);
              }
            }}
            data-panel-animated="true"
            defaultSize={sidebarDefaultSize}
            minSize={mainSidebarSize.minSize}
            maxSize={mainSidebarSize.maxSize}
            className={`bg-sidebar border-r border-border overflow-hidden flex flex-col z-10 ${
              enableAnimations
                ? isSidebarClosing
                  ? "animate-out slide-out-to-left fade-out duration-200"
                  : "animate-in slide-in-from-left fade-in duration-200"
                : ""
            }`}
          >
            {sidebar}
          </Panel>
        )}

        {shouldRenderSidebar && (
          <PanelResizeHandle
            data-separator-feature="default.sidebar"
            className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative"
          />
        )}

        {/* Main Content */}
        <Panel
          id="main-content-panel"
          className="flex-1 min-w-0 bg-app relative flex flex-col z-0"
        >
          <EditorDropZones />
          <div className="flex items-center px-4 py-2 h-12 shrink-0">
            <button
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-active hover:text-fg"
              onClick={toggleLeftSidebar}
              title={
                isSidebarOpen
                  ? t("mainLayout.tooltip.sidebarCollapse")
                  : t("mainLayout.tooltip.sidebarExpand")
              }
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="icon-xl" />
              ) : (
                <PanelLeftOpen className="icon-xl" />
              )}
            </button>

            <div className="flex-1" />

            {isCanvasMode && onCloseCanvas && (
              <button
                className="flex items-center gap-1 bg-transparent border border-border text-muted cursor-pointer px-3 py-1 rounded-md text-xs transition-colors hover:bg-active hover:text-fg mr-2"
                onClick={onCloseCanvas}
                title={t("toolbar.editor")}
              >
                <ChevronLeft className="icon-xs" />
                {t("toolbar.editor")}
              </button>
            )}

            <button
              className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-active hover:text-fg"
              onClick={() => setRegionOpen("rightPanel", !isContextOpen)}
              title={
                isContextOpen
                  ? t("mainLayout.tooltip.contextCollapse")
                  : t("mainLayout.tooltip.contextExpand")
              }
            >
              {isContextOpen ? (
                <PanelRightClose className="icon-xl" />
              ) : (
                <PanelRightOpen className="icon-xl" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col">
            <PanelGroup
              id="main-layout-content-group"
              orientation="horizontal"
              className="flex w-full h-full flex-1 overflow-hidden relative"
              onLayoutChanged={onContentLayoutChanged}
            >
              <Panel
                id="main-primary-content"
                defaultSize={toPercentSize(50)}
                minSize={toPercentSize(20)}
                className="min-w-0 bg-canvas relative flex flex-col"
              >
                {children}
              </Panel>
              {additionalPanels}
              {additionalPanelIds.length === 0 && (
                <Panel
                  id="main-content-placeholder"
                  defaultSize={0}
                  minSize={0}
                  maxSize={0}
                  className="pointer-events-none overflow-hidden opacity-0"
                />
              )}
            </PanelGroup>
          </div>
          <StatusFooter onOpenExport={onOpenExport} />
        </Panel>

        {shouldRenderContext && (
          <PanelResizeHandle
            data-separator-feature="default.panel"
            className="w-1 bg-border/40 hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative"
          />
        )}

        {/* Context Panel */}
        {shouldRenderContext && (
          <Panel
            id="context-panel"
            panelRef={contextPanelRef}
            collapsible
            collapsedSize={0}
            onResize={(panelSize) => {
              const isCollapsed =
                panelSize.asPercentage <= 0.1 || panelSize.inPixels <= 1;
              if (isCollapsed) {
                setRegionOpen("rightPanel", false);
              }
            }}
            data-panel-animated="true"
            defaultSize={contextDefaultSize}
            minSize={mainContextSize.minSize}
            maxSize={mainContextSize.maxSize}
            className={`bg-panel border-l border-border overflow-hidden flex flex-col z-10 ${
              enableAnimations
                ? isContextClosing
                  ? "animate-out slide-out-to-right fade-out duration-200"
                  : "animate-in slide-in-from-right fade-in duration-200"
                : ""
            }`}
          >
            {contextPanel}
          </Panel>
        )}

        {!shouldRenderSidebar && !shouldRenderContext && (
          <Panel
            id="main-layout-placeholder"
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
