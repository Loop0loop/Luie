import { type ReactNode, useCallback, useState, useEffect, useRef } from "react";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import {
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
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
import { useEditorStore } from "@renderer/domains/editor";
import StatusFooter from "@shared/ui/StatusFooter";
import {
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  getResponsivePanelSize,
  toPanelPercentSize,
} from "@renderer/shared/constants/layoutSizing";
import { toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import {
  getPanelLayoutValue,
  suppressLayoutPersistenceFor,
  useLayoutPersist,
} from "@renderer/features/workspace/hooks/useLayoutPersist";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";
import {
  shouldCloseMainLayoutPanelOnResize,
  shouldPersistMainLayoutContext,
  type MainLayoutResizeSurface,
} from "@renderer/features/workspace/utils/mainLayoutResize";
import { createLogger } from "@shared/logger";

const logger = createLogger("MainLayout");

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

  const sidebarSurface = isCanvasMode ? "canvas.activity" : "default.sidebar";
  const contextSurface = isCanvasMode ? "canvas.binder" : "default.panel";
  const mainSidebarConfig = getLayoutSurfaceConfig(sidebarSurface);
  const mainContextConfig = getLayoutSurfaceConfig(contextSurface);
  const mainLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const mainContentGroupRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const contextPanelRef = useRef<PanelImperativeHandle | null>(null);
  const activeResizeSurfaceRef = useRef<MainLayoutResizeSurface | null>(null);
  const activeResizeClearTimerRef = useRef<number | null>(null);
  const openingRegionRef = useRef<"leftSidebar" | "rightPanel" | null>(null);
  const openingRegionTimerRef = useRef<number | null>(null);
  const mainLayoutGroupWidth = useElementWidth(mainLayoutGroupRef);
  const mainContentGroupWidth = useElementWidth(mainContentGroupRef);
  const mainSidebarSize = getResponsivePanelSize(
    mainLayoutGroupWidth,
    mainSidebarConfig,
  );
  const mainContextSize = getResponsivePanelSize(
    mainContentGroupWidth,
    mainContextConfig,
  );

  const persistSidebarLayoutChanged = useLayoutPersist([
    { id: "sidebar-panel", index: 0, surface: sidebarSurface },
  ]);
  const persistContextLayoutChanged = useLayoutPersist([
    { id: "context-panel", index: 1, surface: contextSurface },
  ]);
  const markResizeSurface = useCallback((surface: MainLayoutResizeSurface) => {
    activeResizeSurfaceRef.current = surface;
  }, []);
  const scheduleResizeSurfaceClear = useCallback(
    (surface: MainLayoutResizeSurface | null) => {
      if (surface === null) return;
      if (activeResizeClearTimerRef.current !== null) {
        window.clearTimeout(activeResizeClearTimerRef.current);
      }
      activeResizeClearTimerRef.current = window.setTimeout(() => {
        if (activeResizeSurfaceRef.current === surface) {
          activeResizeSurfaceRef.current = null;
        }
        activeResizeClearTimerRef.current = null;
      }, 180);
    },
    [],
  );
  const onSidebarLayoutChanged = useCallback(
    (layout: Layout) => {
      const activeSurface = activeResizeSurfaceRef.current;
      persistSidebarLayoutChanged(layout);
      scheduleResizeSurfaceClear(activeSurface);
    },
    [persistSidebarLayoutChanged, scheduleResizeSurfaceClear],
  );
  const onContextLayoutChanged = useCallback(
    (layout: Layout) => {
      if (!shouldPersistMainLayoutContext(activeResizeSurfaceRef.current)) {
        logger.debug("Skipped context layout persistence during main sidebar resize", {
          activeResizeSurface: activeResizeSurfaceRef.current,
          contextSurface,
          layout,
        });
        return;
      }
      persistContextLayoutChanged(layout);
      scheduleResizeSurfaceClear(activeResizeSurfaceRef.current);
    },
    [contextSurface, persistContextLayoutChanged, scheduleResizeSurfaceClear],
  );
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
    layoutSurfaceRatios[sidebarSurface] ||
    getLayoutSurfaceDefaultRatio(sidebarSurface);
  const contextRatio =
    layoutSurfaceRatios[contextSurface] ||
    getLayoutSurfaceDefaultRatio(contextSurface);

  const [sidebarDefaultSize, setSidebarDefaultSize] = useState(() =>
    toPanelPercentSize(sidebarRatio),
  );
  const [contextDefaultSize, setContextDefaultSize] = useState(() =>
    toPanelPercentSize(contextRatio),
  );
  const {
    isClosing: isSidebarClosing,
    isOpening: isSidebarOpening,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: sidebarDefaultSize,
    panelRef: sidebarPanelRef,
  });

  const markOpeningRegion = useCallback((region: "leftSidebar" | "rightPanel") => {
    openingRegionRef.current = region;
    if (openingRegionTimerRef.current !== null) {
      window.clearTimeout(openingRegionTimerRef.current);
    }
    openingRegionTimerRef.current = window.setTimeout(() => {
      if (openingRegionRef.current === region) {
        openingRegionRef.current = null;
      }
      openingRegionTimerRef.current = null;
    }, 360);
  }, []);

  const toggleSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      markOpeningRegion("leftSidebar");
    }
    toggleLeftSidebar();
  }, [isSidebarOpen, markOpeningRegion, toggleLeftSidebar]);

  const toggleContextPanel = useCallback(() => {
    if (!isContextOpen) {
      markOpeningRegion("rightPanel");
    }
    setRegionOpen("rightPanel", !isContextOpen);
  }, [isContextOpen, markOpeningRegion, setRegionOpen]);

  useEffect(
    () => () => {
      if (activeResizeClearTimerRef.current !== null) {
        window.clearTimeout(activeResizeClearTimerRef.current);
      }
      if (openingRegionTimerRef.current !== null) {
        window.clearTimeout(openingRegionTimerRef.current);
      }
    },
    [],
  );
  const {
    isClosing: isContextClosing,
    isOpening: isContextOpening,
    shouldRender: shouldRenderContext,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isContextOpen,
    openSize: contextDefaultSize,
    panelRef: contextPanelRef,
  });

  useEffect(() => {
    if (shouldRenderSidebar) return;
    const safeRatio =
      sidebarRatio < 5 ? getLayoutSurfaceDefaultRatio(sidebarSurface) : sidebarRatio;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarDefaultSize(toPanelPercentSize(safeRatio));
  }, [shouldRenderSidebar, sidebarRatio, sidebarSurface]);

  useEffect(() => {
    if (shouldRenderContext) return;
    const safeRatio =
      contextRatio < 5 ? getLayoutSurfaceDefaultRatio(contextSurface) : contextRatio;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContextDefaultSize(toPanelPercentSize(safeRatio));
  }, [shouldRenderContext, contextRatio, contextSurface]);

  return (
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />

      <div className="relative min-h-0 flex-1">
        <PanelGroup
          id="main-layout-group"
          orientation="horizontal"
          className="flex flex-1 overflow-hidden relative w-full h-full"
          elementRef={mainLayoutGroupRef}
          onLayoutChanged={onSidebarLayoutChanged}
        >
          <Panel
            id="sidebar-panel"
            panelRef={sidebarPanelRef}
            collapsible
            collapsedSize={0}
            onResize={(panelSize) => {
              const isOpening =
                isSidebarOpening || openingRegionRef.current === "leftSidebar";
              const shouldClose = shouldCloseMainLayoutPanelOnResize(
                panelSize,
                isOpening,
                isSidebarClosing,
              );
              if (!shouldClose) {
                if (isOpening || isSidebarClosing) {
                  logger.debug("Ignored left sidebar resize during transition", {
                    inPixels: panelSize.inPixels,
                    asPercentage: panelSize.asPercentage,
                    isSidebarOpening,
                    isSidebarClosing,
                    openingRegion: openingRegionRef.current,
                    sidebarSurface,
                  });
                }
                return;
              }
              if (isSidebarOpen) {
                logger.debug("Closed left sidebar from collapsed resize", {
                  inPixels: panelSize.inPixels,
                  asPercentage: panelSize.asPercentage,
                  sidebarSurface,
                });
                suppressLayoutPersistenceFor(500);
                setRegionOpen("leftSidebar", false);
              }
            }}
            data-panel-animated="true"
            defaultSize={isSidebarOpen ? sidebarDefaultSize : 0}
            minSize={mainSidebarSize.minSize}
            maxSize={mainSidebarSize.maxSize}
            className={`bg-sidebar overflow-hidden flex flex-col z-10 ${enableAnimations
                ? isSidebarClosing
                  ? "animate-out slide-out-to-left fade-out duration-200"
                  : isSidebarOpen
                    ? "animate-in slide-in-from-left fade-in duration-200"
                    : ""
                : ""
              }`}
          >
            {shouldRenderSidebar ? sidebar : null}
          </Panel>

          {shouldRenderSidebar && (
            <PanelResizeHandle
              data-separator-feature={sidebarSurface}
              onKeyDown={() => markResizeSurface(sidebarSurface)}
              onPointerDown={() => markResizeSurface(sidebarSurface)}
              className="w-1 bg-transparent hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative"
            />
          )}

          {/* Main Content */}
          <Panel
            id="main-body-panel"
            minSize={0}
            className="flex-1 min-w-0 bg-app relative flex flex-col z-0"
          >
            {/* 패널 접기/펴기 토글 — 에디터 코너에 떠 있는 버튼. 일반 모드는 고스트,
                캔버스 모드는 캔버스 위에 떠야 하므로 backdrop 칩 스타일. */}
            <button
              onClick={toggleSidebar}
              className={
                isCanvasMode
                  ? "absolute left-4 top-4 z-40 flex h-8 w-8 items-center justify-center rounded-panel border border-border/80 bg-app/90 text-muted shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:text-fg active:scale-95 cursor-pointer"
                  : "absolute left-2 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-active hover:text-fg cursor-pointer"
              }
              title={isSidebarOpen ? t("mainLayout.tooltip.sidebarCollapse") : t("mainLayout.tooltip.sidebarExpand")}
              aria-label={isSidebarOpen ? t("mainLayout.tooltip.sidebarCollapse") : t("mainLayout.tooltip.sidebarExpand")}
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleContextPanel}
              className={
                isCanvasMode
                  ? "absolute right-4 top-4 z-40 flex h-8 w-8 items-center justify-center rounded-panel border border-border/80 bg-app/90 text-muted shadow-md backdrop-blur-sm transition-all hover:bg-accent hover:text-fg active:scale-95 cursor-pointer"
                  : "absolute right-2 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-active hover:text-fg cursor-pointer"
              }
              title={isContextOpen ? t("mainLayout.tooltip.contextCollapse") : t("mainLayout.tooltip.contextExpand")}
              aria-label={isContextOpen ? t("mainLayout.tooltip.contextCollapse") : t("mainLayout.tooltip.contextExpand")}
            >
              {isContextOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            </button>

            <PanelGroup
              id="main-layout-body-group"
              orientation="horizontal"
              className="flex w-full h-full flex-1 overflow-hidden relative"
              elementRef={mainContentGroupRef}
              onLayoutChanged={onContextLayoutChanged}
            >
              <Panel
                id="main-content-panel"
                minSize={toPercentSize(10)}
                className="flex-1 min-w-0 bg-app relative flex flex-col z-0"
              >
                <EditorDropZones />
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
                      className="min-w-0 bg-app relative flex flex-col"
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
                {!isCanvasMode && <StatusFooter onOpenExport={onOpenExport} />}
              </Panel>

              {shouldRenderContext && (
                <PanelResizeHandle
                  data-separator-feature={contextSurface}
                  onKeyDown={() => markResizeSurface(contextSurface)}
                  onPointerDown={() => markResizeSurface(contextSurface)}
                  className="w-1 bg-transparent hover:bg-accent/50 active:bg-accent/80 transition-colors cursor-col-resize z-20 relative"
                />
              )}

              <Panel
                id="context-panel"
                panelRef={contextPanelRef}
                collapsible
                collapsedSize={0}
                onResize={(panelSize) => {
                  const isOpening =
                    isContextOpening || openingRegionRef.current === "rightPanel";
                  const shouldClose = shouldCloseMainLayoutPanelOnResize(
                    panelSize,
                    isOpening,
                    isContextClosing,
                  );
                  if (!shouldClose) {
                    if (isOpening || isContextClosing) {
                      logger.debug("Ignored context panel resize during transition", {
                        inPixels: panelSize.inPixels,
                        asPercentage: panelSize.asPercentage,
                        isContextOpening,
                        isContextClosing,
                        openingRegion: openingRegionRef.current,
                        activeResizeSurface: activeResizeSurfaceRef.current,
                        contextSurface,
                        mainContentGroupWidth,
                      });
                    }
                    return;
                  }
                  if (isContextOpen) {
                    logger.debug("Closed context panel from collapsed resize", {
                      inPixels: panelSize.inPixels,
                      asPercentage: panelSize.asPercentage,
                      activeResizeSurface: activeResizeSurfaceRef.current,
                      contextSurface,
                      mainContentGroupWidth,
                    });
                    suppressLayoutPersistenceFor(500);
                    setRegionOpen("rightPanel", false);
                  }
                }}
                data-panel-animated="true"
                groupResizeBehavior="preserve-pixel-size"
                defaultSize={isContextOpen ? contextDefaultSize : 0}
                minSize={mainContextSize.minSize}
                maxSize={mainContextSize.maxSize}
                className={`bg-panel border-l border-border overflow-hidden flex flex-col z-10 ${enableAnimations
                    ? isContextClosing
                      ? "animate-out slide-out-to-right fade-out duration-200"
                      : isContextOpen
                        ? "animate-in slide-in-from-right fade-in duration-200"
                        : ""
                    : ""
                  }`}
              >
                {shouldRenderContext ? contextPanel : null}
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
