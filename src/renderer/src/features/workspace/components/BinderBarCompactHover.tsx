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
import { useProjectLayoutStore } from "@renderer/features/workspace/stores/projectLayoutStore";
import { useEditorBinderResizeHandlers } from "@renderer/features/workspace/hooks/useEditorBinderResizeHandlers";
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
  type LayoutSurfaceId,
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
  // NOTE: 드래그 중 즉시 시각 반영을 위한 로컬 ratio. 다른 레이아웃(GoogleDocsLayout 등)은
  // react-resizable-panels의 Panel이 store와 독립적으로 시각 크기를 담당하지만, 이 flyout은
  // Panel을 쓰지 않고 폭을 store ratio로부터 직접 계산하므로 이 값이 그 역할을 대신한다.
  // store 커밋은 drag 종료 시 1회만 일어나(아래 endResize) 매 픽셀 write를 피한다.
  const [dragRatio, setDragRatio] = useState<number | null>(null);
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
  const projectLayoutHasHydrated = useProjectLayoutStore(
    (state) => state.hasHydrated,
  );
  const uiHasHydrated = useUIStore((state) => state.hasHydrated);
  const upsertProjectLayout = useProjectLayoutStore(
    (state) => state.upsertProjectLayout,
  );
  const persistLayoutSurfaceRatio = useCallback(
    (surface: LayoutSurfaceId, ratio: number) => {
      if (!currentProjectId || !uiHasHydrated || !projectLayoutHasHydrated) return;
      upsertProjectLayout(currentProjectId, {
        layoutSurfaceRatios: { [surface]: ratio } as Record<LayoutSurfaceId, number>,
      });
    },
    [currentProjectId, projectLayoutHasHydrated, uiHasHydrated, upsertProjectLayout],
  );
  // NOTE: 다른 레이아웃(GoogleDocsLayout 등)과 동일한 idle-debounce 커밋 정책을 공유한다.
  // 과거에는 pointer move마다 store를 직접 write했는데, 이 hook은 실제 사용자 드래그의
  // 최종 비율만 idle 후 한 번 커밋한다.
  const resizeHandlers = useEditorBinderResizeHandlers(
    setLayoutSurfaceRatio,
    persistLayoutSurfaceRatio,
  );

  // NOTE: 전체 ratio map 대신 active tab만 구독해 무관한 resize render를 피한다.
  const activeTabRatio = useUIStore((state) => {
    if (!activeCompactTab) return 0;
    const surface = getEditorLayoutPanelSurface(activeCompactTab);
    return state.layoutSurfaceRatios[surface] ?? getLayoutSurfaceDefaultRatio(surface);
  });
  // NOTE: 드래그 중에는 store가 아직 커밋되지 않았으므로(idle-debounce 대기 중) 로컬 값으로
  // 즉시 폭을 반영한다. 드래그가 끝나면(activeTabRatio가 커밋되어 갈아치우므로) null로 되돌린다.
  const effectiveTabRatio = dragRatio ?? activeTabRatio;

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
    const widthByRatio = Math.round((referenceWidth * effectiveTabRatio) / 100);
    return Math.max(COMPACT_BINDER_MIN_WIDTH_PX, Math.min(COMPACT_BINDER_MAX_WIDTH_PX, widthByRatio));
  }, [activeCompactTab, containerWidthPx, effectiveTabRatio]);

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

  // NOTE: 매 pointer move는 시각 반영용 로컬 state만 갱신한다. store 커밋은
  // resizeHandlers(useLayoutSurfaceResizeCommit)가 idle-debounce로 처리하므로 여기서
  // 직접 setLayoutSurfaceRatio를 부르지 않는다(다른 레이아웃과 동일 정책).
  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!activeCompactTab || !dragState) return;
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
      setDragRatio(nextRatio);
      resizeHandlers[activeCompactTab]({
        asPercentage: nextRatio,
        inPixels: nextWidth,
      });
    },
    [activeCompactTab, containerWidthPx, resizeHandlers],
  );

  const endResize = useCallback(() => {
    dragStateRef.current = null;
    setIsResizing(false);
    // NOTE: dragRatio는 여기서 바로 지우지 않는다. store 커밋은 idle-debounce(약 140ms) 뒤에
    // 반영되므로 즉시 null로 되돌리면 activeTabRatio가 따라잡기 전까지 폭이 잠깐 튄다.
    // 아래 effect가 store 값이 드래그 최종값에 도달하면 정리한다.
  }, []);

  // NOTE: store가 드래그 최종 ratio를 따라잡으면(idle-debounce 커밋 완료) 로컬 오버라이드를
  // 정리한다. 그 전에 지우면 activeTabRatio(구 값)로 잠깐 되돌아가는 시각적 튐이 생긴다.
  useEffect(() => {
    if (dragRatio === null || dragStateRef.current !== null) return;
    if (Math.abs(activeTabRatio - dragRatio) < 0.5) {
      setDragRatio(null);
    }
  }, [activeTabRatio, dragRatio]);

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
      // NOTE: 리사이즈 중에는 hover-close를 잠근다. 이게 없으면 드래그 중 포인터가
      // activation zone을 벗어나는 순간 flyout이 자동으로 닫히기 시작해, 다른 레이아웃의
      // 도킹형 패널과 달리 리사이즈 가능한 영역이 좁게 제한된다.
      isResizing={isResizing}
    >
      {/* NOTE: traffic lights 공간만큼 상단 여백을 줘 내용이 표면 확장에 따라 올라가지 않게 한다. */}
      <div style={{ height: sidebarTopOffset }} aria-hidden="true" className="shrink-0" />
      <div className="flex-1 min-h-0 flex flex-row">
        <div
          className={cn(
            // NOTE: 레일(아이콘)과 콘텐츠(연구/스냅샷 등) 표면 색을 하나로 통일한다.
            // bg-panel(#28282b)을 쓰면 GoogleDocsPanelRail/RightPanel(#212123, bg-sidebar와
            // 동일 값)과 색이 갈라져 보인다.
            "h-full border-l border-border/40 bg-sidebar overflow-hidden",
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
                  // NOTE: 다른 레이아웃(GoogleDocsLayout/MainLayout)의 separator는 항상
                  // 무색이다. hover 시 색이 뜨는 건 이 컴포넌트만의 차이였으므로 제거한다.
                  className="absolute left-0 top-0 bottom-0 z-20 w-2 cursor-col-resize bg-transparent"
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
