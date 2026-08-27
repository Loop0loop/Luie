import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BINDER_VALID_TABS,
  BinderSidebarPanelBody,
  buildBinderTabItems,
  FocusHoverSidebar,
  type BinderTab,
  useChapterStore,
} from "@renderer/domains/manuscript";
import { ChevronLeft, X } from "lucide-react";
import { useEditorStore } from "@renderer/domains/editor";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import { cn } from "@shared/types/utils";
import type { Snapshot } from "@shared/types";
import {
  getEditorLayoutPanelSurface,
  getLayoutSurfaceDefaultRatio,
  normalizeLayoutSurfaceRatioInput,
  COMPACT_BINDER_RAIL_WIDTH_PX,
  COMPACT_BINDER_MIN_WIDTH_PX,
  COMPACT_BINDER_MAX_WIDTH_PX,
} from "@renderer/shared/constants/layoutSizing";

const SnapshotViewer = lazy(
  () => import("@renderer/features/snapshot/components/SnapshotViewer"),
);

type BinderBarCompactHoverProps = {
  activeChapterId?: string;
  currentProjectId?: string;
  sidebarTopOffset: number;
  suppressHoverOpen?: boolean;
  onServingStateChange?: (serving: boolean) => void;
  containerWidthPx: number;
};

export function BinderBarCompactHover({
  activeChapterId,
  currentProjectId,
  sidebarTopOffset,
  suppressHoverOpen = false,
  onServingStateChange,
  containerWidthPx,
}: BinderBarCompactHoverProps) {
  const { t } = useTranslation();
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const [isPinned, setIsPinned] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const rightRailOpen = useUIStore((state) => state.regions.rightRail.open);
  const rightPanelActiveTab = useUIStore(
    (state) => state.regions.rightPanel.activeTab,
  );
  const setRegionOpen = useUIStore((state) => state.setRegionOpen);
  const openRightPanelTab = useUIStore((state) => state.openRightPanelTab);
  const closeRightPanel = useUIStore((state) => state.closeRightPanel);
  const setFocusedClosableTarget = useUIStore(
    (state) => state.setFocusedClosableTarget,
  );
  const activeCompactTab =
    rightRailOpen &&
    rightPanelActiveTab &&
    BINDER_VALID_TABS.includes(rightPanelActiveTab as BinderTab)
      ? (rightPanelActiveTab as BinderTab)
      : null;

  const activeChapterContent = useChapterStore(
    (state) => activeChapterId ? state.items.find((c) => c.id === activeChapterId)?.content : undefined,
  );
  const onServingStateChangeRef = useRef(onServingStateChange);
  useEffect(() => {
    onServingStateChangeRef.current = onServingStateChange;
  });
  const dragStateRef = useRef<{
    surface: ReturnType<typeof getEditorLayoutPanelSurface>;
    startX: number;
    startRatio: number;
  } | null>(null);

  const setLayoutSurfaceRatio = useUIStore((state) => state.setLayoutSurfaceRatio);

  // NOTE: 전체 ratio map 대신 active tab만 구독해 무관한 resize render를 피한다.
  const activeTabRatio = useUIStore((state) => {
    if (!activeCompactTab) return 0;
    const surface = getEditorLayoutPanelSurface(activeCompactTab);
    return state.layoutSurfaceRatios[surface] ?? getLayoutSurfaceDefaultRatio(surface);
  });

  const tabItems = useMemo(() => buildBinderTabItems(t), [t]);

  const openCompactTab = useCallback(
    (tab: BinderTab) => {
      setRegionOpen("rightRail", true);
      openRightPanelTab(tab);
      setFocusedClosableTarget({ kind: "compact-binder" });
    },
    [openRightPanelTab, setFocusedClosableTarget, setRegionOpen],
  );

  const closeCompactTab = useCallback(() => {
    setRegionOpen("rightRail", false);
    closeRightPanel();
  }, [closeRightPanel, setRegionOpen]);

  useEffect(() => {
    onServingStateChangeRef.current?.(activeCompactTab !== null);
    void api.logger.debug("compact-binder.serving-state", {
      activeCompactTab,
      serving: activeCompactTab !== null,
    });
  }, [activeCompactTab]);

  const activeContentWidth = useMemo(() => {
    if (activeCompactTab === null) return COMPACT_BINDER_RAIL_WIDTH_PX;
    const referenceWidth =
      Number.isFinite(containerWidthPx) && containerWidthPx > 0
        ? containerWidthPx
        : window.innerWidth;
    const widthByRatio = Math.round((referenceWidth * activeTabRatio) / 100);
    return Math.max(COMPACT_BINDER_MIN_WIDTH_PX, Math.min(COMPACT_BINDER_MAX_WIDTH_PX, widthByRatio));
  }, [activeCompactTab, containerWidthPx, activeTabRatio]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeCompactTab) return;
      const surface = getEditorLayoutPanelSurface(activeCompactTab);
      dragStateRef.current = {
        surface,
        startX: event.clientX,
        startRatio: activeTabRatio,
      };
      setIsResizing(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [activeCompactTab, activeTabRatio],
  );

  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;
      const referenceWidth =
        Number.isFinite(containerWidthPx) && containerWidthPx > 0
          ? containerWidthPx
          : window.innerWidth;
      if (!(referenceWidth > 0)) return;
      const delta = dragState.startX - event.clientX;
      const startWidth = (referenceWidth * dragState.startRatio) / 100;
      const nextWidth = Math.max(COMPACT_BINDER_MIN_WIDTH_PX, Math.min(COMPACT_BINDER_MAX_WIDTH_PX, startWidth + delta));
      const nextRatioRaw = (nextWidth / referenceWidth) * 100;
      const nextRatio = normalizeLayoutSurfaceRatioInput(dragState.surface, nextRatioRaw);
      if (nextRatio === null) return;
      setLayoutSurfaceRatio(dragState.surface, nextRatio);
    },
    [containerWidthPx, setLayoutSurfaceRatio],
  );

  const endResize = useCallback(() => {
    dragStateRef.current = null;
    setIsResizing(false);
  }, []);

  // NOTE: closeFocusedSurface는 snapshot viewer를 먼저 닫고 그다음 binder tab을 닫는다.
  useEffect(() => {
    const handleClose = () => {
      if (selectedSnapshot !== null) {
        setSelectedSnapshot(null);
        return;
      }
      closeCompactTab();
    };
    window.addEventListener("luie:close-compact-binder", handleClose);
    return () => window.removeEventListener("luie:close-compact-binder", handleClose);
  }, [closeCompactTab, selectedSnapshot]);

  return (
    // NOTE: 레일 표면도 research 사이드바와 동일하게 화면 상단(traffic lights 끝)까지
    // 확장한다. 내용은 기존 오프셋 아래에 유지한다.
    <FocusHoverSidebar
      side="right"
      topOffset={0}
      activationWidthPx={COMPACT_BINDER_RAIL_WIDTH_PX}
      closeDelayMs={180}
      suppressHoverOpen={suppressHoverOpen}
      forceOpen={(isPinned && activeCompactTab !== null) || selectedSnapshot !== null}
    >
      {/* NOTE: traffic lights 공간만큼 상단 여백을 줘 내용이 표면 확장에 따라 올라가지 않게 한다. */}
      <div style={{ height: sidebarTopOffset }} aria-hidden="true" className="shrink-0" />
      <div className="flex-1 min-h-0 flex flex-row">
        <div
          className={cn(
            "h-full border-l border-border/40 bg-panel overflow-hidden",
            !isResizing && "transition-[width] duration-150 ease-out",
          )}
          style={{
            width: activeCompactTab !== null ? activeContentWidth : COMPACT_BINDER_RAIL_WIDTH_PX,
          }}
          onMouseEnter={() => setFocusedClosableTarget({ kind: "compact-binder" })}
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
                        openCompactTab(item.tab);
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
              <div
                className={cn(
                  "relative flex-1 min-h-0 overflow-hidden flex flex-col",
                  enableAnimations && "animate-in fade-in duration-150",
                )}
              >
                <div
                  role="separator"
                  aria-orientation="vertical"
                  className="absolute left-0 top-0 bottom-0 z-20 w-2 cursor-col-resize bg-transparent hover:bg-accent/20"
                  onPointerDown={handleResizePointerDown}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={endResize}
                  onPointerCancel={endResize}
                  onLostPointerCapture={endResize}
                />
                {/* NOTE: 목록→diff 전환은 탭 내용을 덮어쓰는 방식(GoogleDocs 스냅샷 UX).
                    분할로 옆에 띄우면 레일 폭이 부족해 diff 가독성이 떨어진다. */}
                {selectedSnapshot !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshot(null)}
                      className="absolute left-2 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-panel text-muted shadow-sm transition-colors hover:bg-surface-hover hover:text-fg"
                      aria-label={t("back", "뒤로가기")}
                      title={t("back", "뒤로가기")}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex-1 min-h-0">
                      <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                        <SnapshotViewer
                          snapshot={selectedSnapshot}
                          currentContent={activeChapterContent}
                        />
                      </Suspense>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="shrink-0 h-10 px-3 border-b border-border/50 flex items-center justify-between text-xs font-medium text-fg/80">
                      <span className="truncate">
                        {tabItems.find((item) => item.tab === activeCompactTab)?.title ?? ""}
                      </span>
                      <button
                        type="button"
                        onClick={closeCompactTab}
                        className="ml-2 shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-hover transition-colors"
                        aria-label={t("snapshot.close")}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <BinderSidebarPanelBody
                        activeChapterId={activeChapterId}
                        activeTab={activeCompactTab}
                        currentProjectId={currentProjectId}
                        onBackToSnapshotList={() => openCompactTab("snapshot")}
                        onClose={closeCompactTab}
                        onOpenSnapshot={setSelectedSnapshot}
                        isPinned={isPinned}
                        onTogglePinned={() => setIsPinned((prev) => !prev)}
                        onResearchTabChange={openRightPanelTab}
                        showHeader={false}
                        t={t}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </FocusHoverSidebar>
  );
}
