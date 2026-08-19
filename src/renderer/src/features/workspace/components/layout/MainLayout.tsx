import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
import { AIPanel } from "@renderer/features/ai";
import { Bot, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
import {
  EDITOR_MIN_PANEL_WIDTH_PX,
  EDITOR_WINDOW_BAR_HEIGHT_PX,
} from "@renderer/shared/constants/editorLayout";
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
const isMacOS = navigator.userAgent.toLowerCase().includes("mac");

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  isResearchPanelAdjacent?: boolean;
  isEditorPanelAdjacent?: boolean;
  isCanvasMode?: boolean;
  onCloseCanvas?: () => void;
}

export default function MainLayout({
  children,
  sidebar,
  additionalPanels,
  additionalPanelIds = [],
  isResearchPanelAdjacent = false,
  isEditorPanelAdjacent = false,
  isCanvasMode = false,
}: MainLayoutProps) {
  const { t } = useTranslation();
  const {
    isSidebarOpen,
    isContextOpen,
    layoutSurfaceRatios,
    toggleLeftSidebar,
    setRegionOpen,
    openRightPanelTab,
    updatePanelSize,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      isContextOpen: state.regions.rightPanel.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      toggleLeftSidebar: state.toggleLeftSidebar,
      setRegionOpen: state.setRegionOpen,
      openRightPanelTab: state.openRightPanelTab,
      updatePanelSize: state.updatePanelSize,
    })),
  );

  const sidebarSurface = isCanvasMode ? "canvas.activity" : "default.sidebar";
  const contextSurface = isCanvasMode ? "canvas.binder" : "default.panel";
  const mainSidebarConfig = getLayoutSurfaceConfig(sidebarSurface);
  const mainContextConfig = getLayoutSurfaceConfig(contextSurface);
  const mainLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const contextPanelRef = useRef<PanelImperativeHandle | null>(null);
  const activeResizeSurfaceRef = useRef<MainLayoutResizeSurface | null>(null);
  const activeResizeClearTimerRef = useRef<number | null>(null);
  const openingRegionRef = useRef<"leftSidebar" | "rightPanel" | null>(null);
  const openingRegionTimerRef = useRef<number | null>(null);
  const mainLayoutGroupWidth = useElementWidth(mainLayoutGroupRef);
  const mainSidebarSize = getResponsivePanelSize(
    mainLayoutGroupWidth,
    mainSidebarConfig,
  );
  const mainContextSize = getResponsivePanelSize(
    mainLayoutGroupWidth,
    mainContextConfig,
  );

  const persistSidebarLayoutChanged = useLayoutPersist([
    { id: "sidebar-panel", index: 0, surface: sidebarSurface },
  ]);
  const persistContextLayoutChanged = useLayoutPersist([
    { id: "context-panel", index: 2, surface: contextSurface },
  ]);
  // NOTE: separator drag 중에는 panel transition이 pointer를 뒤따라오지 못하므로 끈다.
  const [isResizing, setIsResizing] = useState(false);

  const markResizeSurface = useCallback((surface: MainLayoutResizeSurface) => {
    activeResizeSurfaceRef.current = surface;
    setIsResizing(true);
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
        setIsResizing(false);
      }, 180);
    },
    [],
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

  const markOpeningRegion = useCallback(
    (region: "leftSidebar" | "rightPanel") => {
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
    },
    [],
  );

  const toggleSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      markOpeningRegion("leftSidebar");
    }
    toggleLeftSidebar();
  }, [isSidebarOpen, markOpeningRegion, toggleLeftSidebar]);

  const toggleContextPanel = useCallback(() => {
    if (!isContextOpen) {
      markOpeningRegion("rightPanel");
      openRightPanelTab("analysis");
    }
    setRegionOpen("rightPanel", !isContextOpen);
  }, [isContextOpen, markOpeningRegion, openRightPanelTab, setRegionOpen]);

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
  useEffect(() => {
    const stopResizing = () => setIsResizing(false);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
    return () => {
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };
  }, []);
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
  const hasCustomAdjacentSurface =
    isResearchPanelAdjacent || isEditorPanelAdjacent;
  const adjacentSurfaceClass = hasCustomAdjacentSurface
    ? "editor-adjacent-surface editor-research-surface"
    : shouldRenderContext
      ? "editor-adjacent-surface editor-ai-surface"
      : "bg-sidebar";
  const contentSurfaceClass = hasCustomAdjacentSurface
    ? "bg-research border-0 outline-none"
    : shouldRenderContext
      ? "bg-[var(--ai-panel-bg)]"
      : "";
  const layoutGapSurfaceClass = contentSurfaceClass;

  const closeCollapsedRegionAfterMainLayoutChanged = useCallback(
    (layout: Layout, activeSurface: MainLayoutResizeSurface | null) => {
      if (
        activeSurface === sidebarSurface &&
        isSidebarOpen &&
        !isSidebarOpening &&
        !isSidebarClosing
      ) {
        const rawSize = getPanelLayoutValue(layout, "sidebar-panel", 0);
        if (
          typeof rawSize === "number" &&
          shouldCloseMainLayoutPanelOnResize(
            { asPercentage: rawSize, inPixels: Number.POSITIVE_INFINITY },
            false,
            false,
          )
        ) {
          logger.debug("Closed left sidebar after collapsed layout commit", {
            asPercentage: rawSize,
            sidebarSurface,
          });
          suppressLayoutPersistenceFor(500);
          setRegionOpen("leftSidebar", false);
        }
      }

      if (
        activeSurface === contextSurface &&
        isContextOpen &&
        !isContextOpening &&
        !isContextClosing
      ) {
        const rawSize = getPanelLayoutValue(layout, "context-panel", 2);
        if (
          typeof rawSize === "number" &&
          shouldCloseMainLayoutPanelOnResize(
            { asPercentage: rawSize, inPixels: Number.POSITIVE_INFINITY },
            false,
            false,
          )
        ) {
          logger.debug("Closed context panel after collapsed layout commit", {
            asPercentage: rawSize,
            activeResizeSurface: activeSurface,
            contextSurface,
          });
          suppressLayoutPersistenceFor(500);
          setRegionOpen("rightPanel", false);
        }
      }
    },
    [
      contextSurface,
      isContextClosing,
      isContextOpen,
      isContextOpening,
      isSidebarClosing,
      isSidebarOpen,
      isSidebarOpening,
      setRegionOpen,
      sidebarSurface,
    ],
  );
  const onMainLayoutChanged = useCallback(
    (layout: Layout) => {
      const activeSurface = activeResizeSurfaceRef.current;
      persistSidebarLayoutChanged(layout);
      closeCollapsedRegionAfterMainLayoutChanged(layout, activeSurface);
      if (!shouldPersistMainLayoutContext(activeSurface)) {
        logger.debug(
          "Skipped context layout persistence during main sidebar resize",
          {
            activeResizeSurface: activeSurface,
            contextSurface,
            layout,
          },
        );
        scheduleResizeSurfaceClear(activeSurface);
        return;
      }
      persistContextLayoutChanged(layout);
      scheduleResizeSurfaceClear(activeSurface);
    },
    [
      closeCollapsedRegionAfterMainLayoutChanged,
      contextSurface,
      persistContextLayoutChanged,
      persistSidebarLayoutChanged,
      scheduleResizeSurfaceClear,
    ],
  );

  useEffect(() => {
    if (shouldRenderSidebar) return;
    const safeRatio =
      sidebarRatio < 5
        ? getLayoutSurfaceDefaultRatio(sidebarSurface)
        : sidebarRatio;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 숨긴 panel의 다음 mount 기본값을 저장 ratio와 동기화한다.
    setSidebarDefaultSize(toPanelPercentSize(safeRatio));
  }, [shouldRenderSidebar, sidebarRatio, sidebarSurface]);

  useEffect(() => {
    if (shouldRenderContext) return;
    const safeRatio =
      contextRatio < 5
        ? getLayoutSurfaceDefaultRatio(contextSurface)
        : contextRatio;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 숨긴 panel의 다음 mount 기본값을 저장 ratio와 동기화한다.
    setContextDefaultSize(toPanelPercentSize(safeRatio));
  }, [shouldRenderContext, contextRatio, contextSurface]);

  return (
    <div className="relative flex flex-col h-screen bg-app text-fg">
      <div className={`relative min-h-0 flex-1 ${layoutGapSurfaceClass}`}>
        <PanelGroup
          id="main-layout-group"
          orientation="horizontal"
          className={`flex flex-1 overflow-hidden relative w-full h-full ${layoutGapSurfaceClass}`}
          elementRef={mainLayoutGroupRef}
          onLayoutChanged={onMainLayoutChanged}
        >
          <Panel
            id="sidebar-panel"
            panelRef={sidebarPanelRef}
            collapsible
            collapsedSize={0}
            data-panel-animated={isResizing ? undefined : "true"}
            defaultSize={isSidebarOpen ? sidebarDefaultSize : 0}
            minSize={mainSidebarSize.minSize}
            maxSize={mainSidebarSize.maxSize}
            className={`bg-sidebar overflow-hidden flex flex-col z-10 ${
              enableAnimations
                ? isSidebarClosing
                  ? "animate-out slide-out-to-left fade-out duration-200"
                  : isSidebarOpen
                    ? "animate-in slide-in-from-left fade-in duration-200"
                    : ""
                : ""
            }`}
          >
            {shouldRenderSidebar ? (
              isCanvasMode && isMacOS ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div
                    aria-hidden="true"
                    className="shrink-0"
                    style={
                      {
                        height: EDITOR_WINDOW_BAR_HEIGHT_PX,
                        WebkitAppRegion: "drag",
                      } as CSSProperties
                    }
                  />
                  <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
                </div>
              ) : (
                sidebar
              )
            ) : null}
          </Panel>

          {shouldRenderSidebar && (
            <PanelResizeHandle
              data-separator-feature={sidebarSurface}
              onKeyDown={() => markResizeSurface(sidebarSurface)}
              onPointerDown={() => markResizeSurface(sidebarSurface)}
              className="relative z-20 w-0 cursor-col-resize"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>
          )}

          <Panel
            id="main-content-panel"
            minSize={`${EDITOR_MIN_PANEL_WIDTH_PX}px`}
            className={`relative z-0 flex min-w-0 flex-1 flex-col ${
              layoutGapSurfaceClass || "bg-app"
            }`}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 z-30 h-11"
              style={{ WebkitAppRegion: "drag" } as CSSProperties}
            />
            <EditorDropZones />
            <div
              className={`flex flex-1 flex-col overflow-y-auto ${contentSurfaceClass}`}
            >
              <PanelGroup
                id="main-layout-content-group"
                orientation="horizontal"
                className="relative flex h-full w-full flex-1 overflow-hidden"
                onLayoutChanged={onContentLayoutChanged}
              >
                <Panel
                  id="main-primary-content"
                  defaultSize={toPercentSize(50)}
                  minSize={`${EDITOR_MIN_PANEL_WIDTH_PX}px`}
                  className={`relative flex min-w-0 flex-col ${adjacentSurfaceClass}`}
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
            <button
              onClick={toggleSidebar}
              className={`absolute top-2 z-[110] flex h-8 w-8 items-center justify-center transition-all cursor-pointer ${
                isCanvasMode
                  ? "canvas-floating-toolbar text-muted hover:text-fg rounded-full"
                  : "rounded-control text-muted hover:bg-active hover:text-fg"
              } ${
                isMacOS && !isSidebarOpen ? "left-[92px]" : "left-2"
              }`}
              style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
              title={
                isSidebarOpen
                  ? t("mainLayout.tooltip.sidebarCollapse")
                  : t("mainLayout.tooltip.sidebarExpand")
              }
              aria-label={
                isSidebarOpen
                  ? t("mainLayout.tooltip.sidebarCollapse")
                  : t("mainLayout.tooltip.sidebarExpand")
              }
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </button>
            {!isCanvasMode && (
              <button
                onClick={toggleContextPanel}
                className={`absolute right-2 top-2 z-[110] flex h-8 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium transition-all cursor-pointer ${
                  isContextOpen
                    ? "bg-accent text-accent-fg shadow-xs font-semibold"
                    : "border border-border/80 bg-element text-fg hover:bg-surface-hover hover:text-accent shadow-xs"
                }`}
                style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
                title={
                  isContextOpen
                    ? t("ai.sidePanel.close")
                    : t("ai.sidePanel.open")
                }
                aria-label={
                  isContextOpen
                    ? t("ai.sidePanel.close")
                    : t("ai.sidePanel.open")
                }
              >
                <Bot className="h-4 w-4" />
                <span>{t("ai.sidePanel.view")}</span>
              </button>
            )}
          </Panel>

          {shouldRenderContext && (
            <PanelResizeHandle
              data-separator-feature={contextSurface}
              onKeyDown={() => markResizeSurface(contextSurface)}
              onPointerDown={() => markResizeSurface(contextSurface)}
              className="relative z-20 w-0 cursor-col-resize"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>
          )}

          <Panel
            id="context-panel"
            panelRef={contextPanelRef}
            collapsible
            collapsedSize={0}
            data-panel-animated={isResizing ? undefined : "true"}
            groupResizeBehavior="preserve-pixel-size"
            defaultSize={isContextOpen ? contextDefaultSize : 0}
            minSize={mainContextSize.minSize}
            maxSize={mainContextSize.maxSize}
            className={`relative z-10 flex flex-col overflow-hidden bg-[var(--ai-panel-bg)] ${
              shouldRenderContext
                ? "rounded-l-[var(--radius-editor-shell)]"
                : ""
            } ${
              enableAnimations
                ? isContextClosing
                  ? "animate-out slide-out-to-right fade-out duration-200"
                  : isContextOpen
                    ? "animate-in slide-in-from-right fade-in duration-200"
                    : ""
                : ""
            }`}
          >
            {shouldRenderContext ? (
              <div className="flex h-full flex-col overflow-hidden bg-[var(--ai-panel-bg)]">
                <AIPanel
                  onClose={toggleContextPanel}
                  onMinimize={toggleContextPanel}
                />
              </div>
            ) : null}
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
