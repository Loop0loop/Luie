import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { InspectorPanel, Ribbon, useEditorStatsStore, useEditorStore } from "@renderer/domains/editor";
import { AIPanel } from "@renderer/features/ai";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useShallow } from "zustand/react/shallow";
import { CanvasPane } from "@renderer/domains/canvas";
import {
  EventDetailView,
  FactionDetailView,
  MemoMainView,
  WikiDetailView,
  WorldSection,
} from "@renderer/domains/world";
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
} from "@renderer/shared/constants/layoutSizing";
import { toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import {
  getPanelLayoutValue,
  useLayoutPersist,
} from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  groupLayoutMatchesPanels,
} from "@renderer/features/workspace/utils/panelGroupLayout";
import {
  getScrivenerLayoutPersistTarget,
  type ScrivenerLayoutResizeSurface,
} from "@renderer/features/workspace/utils/scrivenerLayoutResize";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";
import { DEFAULT_EDITOR_MAX_WIDTH } from "@shared/constants/app/configs";

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
  const {
    mainView,
    panels,
    layoutSurfaceRatios,
    isSidebarOpen,
    isInspectorOpen,
    setRegionOpen,
    setMainView,
    updatePanelSize,
  } = useUIStore(
    useShallow((state) => ({
      mainView: state.mainView,
      panels: state.panels,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      isSidebarOpen: state.regions.leftSidebar.open,
      isInspectorOpen: state.regions.rightPanel.open,
      setRegionOpen: state.setRegionOpen,
      setMainView: state.setMainView,
      updatePanelSize: state.updatePanelSize,
    }))
  );
  const editorSplitGroupRef = useRef<GroupImperativeHandle | null>(null);
  const scrivenerLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const inspectorPanelRef = useRef<PanelImperativeHandle | null>(null);
  const activeResizeSurfaceRef = useRef<ScrivenerLayoutResizeSurface | null>(null);
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

  const onBinderLayoutChanged = useLayoutPersist([
    { id: "sidebar", index: 0, surface: "scrivener.binder" },
  ]);
  const onInspectorLayoutChanged = useLayoutPersist([
    { id: "inspector", index: 2, surface: "scrivener.inspector" },
  ]);
  const markResizeSurface = useCallback((surface: ScrivenerLayoutResizeSurface) => {
    activeResizeSurfaceRef.current = surface;
  }, []);
  const onLayoutChanged = useCallback(
    (layout: Layout) => {
      const target = getScrivenerLayoutPersistTarget(
        activeResizeSurfaceRef.current,
      );
      activeResizeSurfaceRef.current = null;
      if (target === "binder") {
        onBinderLayoutChanged(layout);
        return;
      }
      if (target === "inspector") {
        onInspectorLayoutChanged(layout);
        return;
      }
    },
    [onBinderLayoutChanged, onInspectorLayoutChanged],
  );

  const binderRatio =
    layoutSurfaceRatios["scrivener.binder"] ||
    getLayoutSurfaceDefaultRatio("scrivener.binder");
  const inspectorRatio =
    layoutSurfaceRatios["scrivener.inspector"] ||
    getLayoutSurfaceDefaultRatio("scrivener.inspector");
  // NOTE: 원지(용지) 폭은 사용자 설정을 따르되 컨테이너를 넘지 않게 100%로 캡한다.
  const paperWidthStyle = {
    width: maxWidth ?? DEFAULT_EDITOR_MAX_WIDTH,
    maxWidth: "100%",
  } as CSSProperties;
  const {
    isClosing: isSidebarClosing,
    isOpening: isSidebarOpening,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: toPanelPercentSize(binderRatio),
    panelRef: sidebarPanelRef,
  });
  const {
    isClosing: isInspectorClosing,
    isOpening: isInspectorOpening,
    shouldRender: shouldRenderInspector,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isInspectorOpen,
    openSize: toPanelPercentSize(inspectorRatio),
    panelRef: inspectorPanelRef,
  });
  const scrivenerLayoutGroupWidth = useElementWidth(scrivenerLayoutGroupRef);

  // NOTE: 리본을 overlay 밴드로 띄워 사이드바/인스펙터 표면이 화면 상단까지 확장된다.
  // 콘텐츠는 측정된 밴드 높이 아래에 유지한다(표면 확장과 내용 위치를 분리).
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(48);
  useLayoutEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return undefined;
    const syncHeaderHeight = () => {
      const nextHeight = Math.ceil(headerEl.offsetHeight);
      setHeaderHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );
    };
    syncHeaderHeight();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(syncHeaderHeight);
    observer?.observe(headerEl);
    return () => observer?.disconnect();
  }, []);
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
        // Legacy analysis routes now use the same docked AI runtime as every other entry point.
        return <AIPanel onClose={() => setMainView({ type: "editor" })} />;
      case "canvas":
        return <CanvasPane />;
      case "editor":
      default:
        return children;
    }
  };

  return (
    <div className="relative h-screen w-screen bg-app text-fg overflow-hidden">
      {/* NOTE: 리본은 overlay 밴드. 빈 공간은 창 드래그(DnD)이고 툴바 버튼 컨텐츠는
          no-drag라 기능이 유지된다. 사이드바/인스펙터 표면은 이 밴드 아래까지 확장되고
          각 패널은 headerHeight 만큼 내용 오프셋을 둔다. */}
      <div
        ref={headerRef}
        className="absolute inset-x-0 top-0 z-40 select-none"
        style={{ WebkitAppRegion: "drag" } as CSSProperties}
      >
        <Ribbon
          editor={editor}
          onOpenSettings={onOpenSettings}
          activeChapterId={activeChapterId}
          onOpenExportPreview={onOpenExport}
          onOpenWorldGraph={onOpenWorldGraph}
          isCanvasMode={mainView.type === "canvas"}
          onCloseCanvas={onCloseCanvas}
        />
      </div>

      <PanelGroup
        orientation="horizontal"
        className="flex w-full h-full flex-1 overflow-hidden relative"
        id="scrivener-layout-group"
        elementRef={scrivenerLayoutGroupRef}
        onLayoutChanged={onLayoutChanged}
      >

          {shouldRenderSidebar && (
            <>
              <Panel
                id="sidebar"
                panelRef={sidebarPanelRef}
                collapsible
                collapsedSize={0}
                data-panel-animated={
                  isSidebarOpening || isSidebarClosing ? "true" : undefined
                }
                groupResizeBehavior="preserve-pixel-size"
                defaultSize={toPanelPercentSize(binderRatio)}
                minSize={binderSize.minSize}
                maxSize={binderSize.maxSize}
                className={`bg-sidebar border-r border-border flex flex-col shrink-0 min-w-0 overflow-hidden ${enableAnimations
                  ? isSidebarClosing
                    ? "animate-out slide-out-to-left fade-out duration-200"
                    : "animate-in slide-in-from-left fade-in duration-200"
                  : ""
                  }`}
              >
                <div className="shrink-0" style={{ height: headerHeight }} aria-hidden="true" />
                {sidebar}
              </Panel>

              <PanelResizeHandle
                data-separator-feature="scrivener.binder"
                onKeyDownCapture={() => markResizeSurface("scrivener.binder")}
                onPointerDownCapture={() => markResizeSurface("scrivener.binder")}
                onKeyDown={() => markResizeSurface("scrivener.binder")}
                onPointerDown={() => markResizeSurface("scrivener.binder")}
                className={`w-1 shrink-0 bg-transparent hover:bg-transparent focus-visible:bg-transparent cursor-col-resize z-10 relative ${enableAnimations && isSidebarClosing
                ? "opacity-0 transition-opacity duration-200"
                : ""
                }`}
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          <Panel
            id="main-editor"
            minSize={toPercentSize(30)}
            className="min-w-0 bg-app flex flex-col relative z-0"
          >
            <div className="shrink-0" style={{ height: headerHeight }} aria-hidden="true" />

            {/* NOTE: 타이틀바 자체가 창 드래그(DnD) 영역. 좌우 버튼 묶음은 no-drag라 기능이 유지된다. */}
            <div
              className="h-8 bg-surface border-b border-border flex items-center px-4 justify-between shrink-0"
              style={{ WebkitAppRegion: "drag" } as CSSProperties}
            >
              <div
                className="flex items-center gap-2 overflow-hidden"
                style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
              >
                {!shouldRenderSidebar && (
                  <button
                    onClick={() => setRegionOpen("leftSidebar", true)}
                    className="p-1 rounded hover:bg-muted/40 text-muted transition-colors mr-2 shrink-0"
                    title={t("sidebar.toggle.open")}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
                <span className="font-semibold text-sm truncate opacity-80">
                  {activeChapterTitle || t("project.defaults.untitled")}
                </span>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ WebkitAppRegion: "no-drag" } as CSSProperties}
              >
                {!shouldRenderInspector && (
                  <button
                    onClick={() => setRegionOpen("rightPanel", true)}
                    className="p-1 rounded hover:bg-muted/40 text-muted transition-colors shrink-0"
                    title={t("scrivener.inspector.open")}
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

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
                      {/* NOTE: 스크리브너식 원고 영역은 가용 높이를 항상 채운다.
                          min-h-full 래퍼만 두면 Editor 루트의 h-full이 auto로 무너져
                          빈 챕터에서 원고가 minHeight(400px)에 고정된다. Editor는
                          scrollable 모드라 내부 스크롤을 담당하므로 h-definite를 준다.
                          원고 외 상세 뷰(등장인물·사건 등)는 자연 성장 + 외부 스크롤을 유지한다. */}
                      {mainView.type === "editor" ? (
                        <div
                          className="mx-auto h-full bg-transparent text-fg transition-all duration-150 ease-out"
                          style={paperWidthStyle}
                        >
                          {renderMainContent()}
                        </div>
                      ) : (
                        <div
                          className="min-h-full bg-transparent text-fg transition-all duration-150 ease-out"
                          style={paperWidthStyle}
                        >
                          {renderMainContent()}
                        </div>
                      )}
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

            <div className="h-6 bg-surface border-t border-border flex items-center px-3 text-xs text-muted shrink-0">
              <span>
                {t("editor.status.charLabel")} {charCount}
                {t("editor.status.separator")}
                {t("editor.status.wordLabel")} {wordCount}
              </span>
            </div>
          </Panel>

          {shouldRenderInspector && (
            <>
              <PanelResizeHandle
                data-separator-feature="scrivener.inspector"
                onKeyDownCapture={() => markResizeSurface("scrivener.inspector")}
                onPointerDownCapture={() => markResizeSurface("scrivener.inspector")}
                onKeyDown={() => markResizeSurface("scrivener.inspector")}
                onPointerDown={() => markResizeSurface("scrivener.inspector")}
                className={`w-1 shrink-0 bg-transparent hover:bg-transparent focus-visible:bg-transparent cursor-col-resize z-10 relative ${enableAnimations && isInspectorClosing
                ? "opacity-0 transition-opacity duration-200"
                : ""
                }`}
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>

              <Panel
                id="inspector"
                panelRef={inspectorPanelRef}
                collapsible
                collapsedSize={0}
                data-panel-animated={
                  isInspectorOpening || isInspectorClosing ? "true" : undefined
                }
                groupResizeBehavior="preserve-pixel-size"
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
                <div className="shrink-0" style={{ height: headerHeight }} aria-hidden="true" />
                <div className="flex items-center justify-between border-b border-border bg-surface px-2 shadow-sm min-h-[32px] shrink-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted ml-2">{t("scrivener.inspector.title")}</span>
                  <button
                    onClick={() => setRegionOpen("rightPanel", false)}
                    className="p-1.5 rounded hover:bg-muted/40 text-muted transition-colors"
                    title={t("scrivener.inspector.close")}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col">
                  {mainView.type === "canvas" ? (
                    <AIPanel
                      onClose={() => setRegionOpen("rightPanel", false)}
                      onMinimize={() => setRegionOpen("rightPanel", false)}
                    />
                  ) : (
                    <InspectorPanel key={activeChapterId} activeChapterId={activeChapterId} />
                  )}
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
  );
}
