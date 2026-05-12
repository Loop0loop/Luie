import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import FocusHoverSidebar from "@renderer/features/manuscript/components/FocusHoverSidebar";
import {
  buildBinderTabItems,
  type BinderTab,
} from "@renderer/features/manuscript/components/binderSidebar.shared";
import { BinderSidebarPanelBody } from "@renderer/features/manuscript/components/BinderSidebarPanelBody";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  normalizeLayoutSurfaceRatioInput,
} from "@shared/constants/layoutSizing";

type BinderBarCompactHoverProps = {
  activeChapterId?: string;
  currentProjectId?: string;
  sidebarTopOffset: number;
  suppressHoverOpen?: boolean;
  onServingStateChange?: (serving: boolean) => void;
  containerWidthPx: number;
};

const RAIL_WIDTH_PX = 44;

export function BinderBarCompactHover({
  activeChapterId,
  currentProjectId,
  sidebarTopOffset,
  suppressHoverOpen = false,
  onServingStateChange,
  containerWidthPx,
}: BinderBarCompactHoverProps) {
  const { t } = useTranslation();
  const [activeCompactTab, setActiveCompactTab] = useState<BinderTab | null>(
    null,
  );
  const [isPinned, setIsPinned] = useState(false);
  const dragStateRef = useRef<{
    surface: ReturnType<typeof getEditorLayoutPanelSurface>;
    startX: number;
    startRatio: number;
  } | null>(null);
  const layoutSurfaceRatios = useUIStore((state) => state.layoutSurfaceRatios);
  const setLayoutSurfaceRatio = useUIStore(
    (state) => state.setLayoutSurfaceRatio,
  );
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);

  const tabItems = useMemo(() => buildBinderTabItems(t), [t]);
  const activeTabLabel = useMemo(
    () => tabItems.find((item) => item.tab === activeCompactTab)?.title ?? "",
    [activeCompactTab, tabItems],
  );

  useEffect(() => {
    onServingStateChange?.(activeCompactTab !== null);
    void api.logger.debug("compact-binder.serving-state", {
      activeCompactTab,
      serving: activeCompactTab !== null,
    });
  }, [activeCompactTab, onServingStateChange]);

  const activeContentWidth = useMemo(() => {
    if (activeCompactTab === null) return RAIL_WIDTH_PX;
    const surface = getEditorLayoutPanelSurface(activeCompactTab);
    const config = getLayoutSurfaceConfig(surface);
    const ratio =
      layoutSurfaceRatios[surface] ?? getLayoutSurfaceDefaultRatio(surface);
    const referenceWidth =
      Number.isFinite(containerWidthPx) && containerWidthPx > 0
        ? containerWidthPx
        : window.innerWidth;
    const widthByRatio = Math.round((referenceWidth * ratio) / 100);
    return Math.max(config.minPx, Math.min(config.maxPx, widthByRatio));
  }, [activeCompactTab, containerWidthPx, layoutSurfaceRatios]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activeCompactTab === null) return;
      const surface = getEditorLayoutPanelSurface(activeCompactTab);
      const currentRatio =
        layoutSurfaceRatios[surface] ?? getLayoutSurfaceDefaultRatio(surface);
      dragStateRef.current = {
        surface,
        startX: event.clientX,
        startRatio: currentRatio,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [activeCompactTab, layoutSurfaceRatios],
  );

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const config = getLayoutSurfaceConfig(dragState.surface);
      const referenceWidth =
        Number.isFinite(containerWidthPx) && containerWidthPx > 0
          ? containerWidthPx
          : window.innerWidth;
      if (!(referenceWidth > 0)) return;
      const delta = dragState.startX - event.clientX;
      const startWidth = (referenceWidth * dragState.startRatio) / 100;
      const nextWidth = Math.max(
        config.minPx,
        Math.min(config.maxPx, startWidth + delta),
      );
      const nextRatioRaw = (nextWidth / referenceWidth) * 100;
      const nextRatio = normalizeLayoutSurfaceRatioInput(
        dragState.surface,
        nextRatioRaw,
      );
      if (nextRatio === null) return;
      setLayoutSurfaceRatio(dragState.surface, nextRatio);
    },
    [containerWidthPx, setLayoutSurfaceRatio],
  );

  const endResize = useCallback(() => {
    dragStateRef.current = null;
  }, []);

  return (
    <FocusHoverSidebar
      side="right"
      topOffset={sidebarTopOffset}
      activationWidthPx={RAIL_WIDTH_PX}
      closeDelayMs={180}
      suppressHoverOpen={suppressHoverOpen}
    >
      <div
        className="h-full border-l border-border/40 bg-sidebar/75 shadow-lg backdrop-blur-sm overflow-hidden transition-[width] duration-150"
        style={{
          width: activeCompactTab !== null ? activeContentWidth : RAIL_WIDTH_PX,
        }}
      >
        <div className="h-full flex flex-col">
          {activeCompactTab === null ? (
            <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1.5">
              {tabItems.map((item) => (
                <div key={item.tab} className="w-full px-1 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      void api.logger.info("compact-binder.open-tab", {
                        tab: item.tab,
                        source: "icon-button",
                      });
                      closeRightPanel();
                      setActiveCompactTab(item.tab);
                    }}
                    title={item.title}
                    className="w-10 h-10 flex items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95 text-muted hover:text-fg hover:bg-surface-hover"
                  >
                    {item.icon}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative flex-1 min-h-0 overflow-hidden">
              <div
                role="separator"
                aria-orientation="vertical"
                className="absolute left-0 top-0 bottom-0 z-20 w-2 cursor-col-resize bg-transparent hover:bg-accent/20"
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={endResize}
                onPointerCancel={endResize}
              />
              <div className="h-10 px-3 border-b border-border/50 flex items-center text-xs font-medium text-fg/80">
                <span className="truncate">{activeTabLabel}</span>
              </div>
              <div className="h-[calc(100%-2.5rem)] overflow-hidden">
                <BinderSidebarPanelBody
                  activeChapterId={activeChapterId}
                  activeTab={activeCompactTab}
                  currentProjectId={currentProjectId}
                  onBackToSnapshotList={() => setActiveCompactTab("snapshot")}
                  onClose={() => setActiveCompactTab(null)}
                  isPinned={isPinned}
                  onTogglePinned={() => setIsPinned((prev) => !prev)}
                  t={t}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </FocusHoverSidebar>
  );
}
