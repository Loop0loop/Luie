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
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  normalizeLayoutSurfaceRatioInput,
  COMPACT_BINDER_RAIL_WIDTH_PX,
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
  containerWidthPx: number;
};

export function BinderBarCompactHover({
  activeChapterId,
  currentProjectId,
  sidebarTopOffset,
  suppressHoverOpen = false,
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
  // NOTE: character/event/faction 패널(EntityGallery)은 제목·탭·검색·닫기를 포함한 자체
  // 헤더를 렌더한다. 레일 쪽 제목 스트립까지 같이 두면 헤더가 두 줄로 겹친다.
  const hasOwnPanelHeader =
    activeCompactTab === "character" ||
    activeCompactTab === "event" ||
    activeCompactTab === "faction";

  const dragStateRef = useRef<{
    surface: ReturnType<typeof getEditorLayoutPanelSurface>;
    startX: number;
    startWidth: number;
  } | null>(null);
  // NOTE: 드래그 중 폭은 React state가 아니라 이 element에 직접 쓴다. state로 두면
  // pointermove마다 flyout 서브트리(ResearchPanel/SnapshotViewer/BinderSidebarPanelBody)가
  // 전부 리렌더된다.
  const panelElementRef = useRef<HTMLDivElement | null>(null);

  const setLayoutSurfaceRatio = useUIStore((state) => state.setLayoutSurfaceRatio);
  const persistLayoutSurfaceRatio = useCallback(
    (surface: LayoutSurfaceId, ratio: number) => {
      if (!currentProjectId) return;
      // NOTE: hydration 플래그와 store action은 렌더에서 쓰지 않는다. 구독하면 hydration이
      // 끝나는 순간 이 컴포넌트가 리렌더된다. 호출 시점에 읽는다(useLayoutPersist와 동일 정책).
      if (!useUIStore.getState().hasHydrated) return;
      const { hasHydrated: projectLayoutHasHydrated, upsertProjectLayout } =
        useProjectLayoutStore.getState();
      if (!projectLayoutHasHydrated) return;
      upsertProjectLayout(currentProjectId, {
        layoutSurfaceRatios: { [surface]: ratio } as Record<LayoutSurfaceId, number>,
      });
    },
    [currentProjectId],
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

  // NOTE: 드래그 클램프와 저장 정책은 같은 소스(활성 탭의 surface config)를 써야 한다.
  // 과거에는 COMPACT_BINDER_MIN/MAX_WIDTH_PX 라는 별개 상수로 클램프해서, surface 정책과
  // 실제 조절 범위가 어긋났다.
  const activeSurfaceConfig = activeCompactTab
    ? getLayoutSurfaceConfig(getEditorLayoutPanelSurface(activeCompactTab))
    : null;

  const activeContentWidth = useMemo(() => {
    if (activeCompactTab === null || activeSurfaceConfig === null) {
      return COMPACT_BINDER_RAIL_WIDTH_PX;
    }
    const referenceWidth =
      Number.isFinite(containerWidthPx) && containerWidthPx > 0
        ? containerWidthPx
        : window.innerWidth;
    const widthByRatio = Math.round((referenceWidth * activeTabRatio) / 100);
    return Math.max(
      activeSurfaceConfig.minPx,
      Math.min(activeSurfaceConfig.maxPx, widthByRatio),
    );
  }, [activeCompactTab, activeSurfaceConfig, containerWidthPx, activeTabRatio]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeCompactTab) return;
      const surface = getEditorLayoutPanelSurface(activeCompactTab);
      dragStateRef.current = {
        surface,
        startX: event.clientX,
        // NOTE: 기준은 store ratio가 아니라 실측 폭이다. store ratio는 min/max 클램프 이전
        // 값이라 표시 폭과 다를 수 있고, 그 차이만큼 드래그 첫 프레임에 패널이 튀었다.
        startWidth:
          panelElementRef.current?.getBoundingClientRect().width ??
          activeContentWidth,
      };
      setIsResizing(true);
      // NOTE: pointer capture로 포인터가 separator를 벗어나도 이 요소가 계속 move/up 이벤트를
      // 받는다. 덕분에 창 어디까지 끌어도 드래그가 유지된다.
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [activeCompactTab, activeContentWidth],
  );

  // NOTE: 폭은 DOM에 직접 쓰고 state는 건드리지 않는다(드래그 중 리렌더 0회). store 커밋은
  // resizeHandlers가 idle-debounce로 처리한다.
  const handleResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (!activeCompactTab || !dragState || activeSurfaceConfig === null) return;
      const referenceWidth =
        Number.isFinite(containerWidthPx) && containerWidthPx > 0
          ? containerWidthPx
          : window.innerWidth;
      if (!(referenceWidth > 0)) return;
      const delta = dragState.startX - event.clientX;
      const nextWidth = Math.max(
        activeSurfaceConfig.minPx,
        Math.min(activeSurfaceConfig.maxPx, dragState.startWidth + delta),
      );
      const nextRatioRaw = (nextWidth / referenceWidth) * 100;
      const nextRatio = normalizeLayoutSurfaceRatioInput(dragState.surface, nextRatioRaw);
      if (nextRatio === null) return;
      const panelElement = panelElementRef.current;
      if (panelElement) {
        panelElement.style.width = `${nextWidth}px`;
      }
      resizeHandlers[activeCompactTab].onResize({
        asPercentage: nextRatio,
        inPixels: nextWidth,
      });
    },
    [activeCompactTab, activeSurfaceConfig, containerWidthPx, resizeHandlers],
  );

  const endResize = useCallback(() => {
    if (dragStateRef.current === null) return;
    dragStateRef.current = null;
    // NOTE: 대기 중인 커밋을 같은 tick에 확정한다. 이게 없으면 idle-debounce가 끝나기 전에
    // 리렌더가 일어나 예전 ratio로 폭이 계산되고, DOM에 써둔 폭이 한 프레임 되돌아간다.
    if (activeCompactTab) {
      resizeHandlers[activeCompactTab].endInteraction();
    }
    setIsResizing(false);
  }, [activeCompactTab, resizeHandlers]);

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
      // NOTE: `isResizing`은 넘기지 않는다. FocusHoverSidebar는 이미 `buttons !== 0`으로
      // 버튼을 누른 동안 hover-close를 건너뛰므로 드래그 중 닫힘은 원래부터 막혀 있다.
      // 반대로 이 prop을 켜면 내부 effect가 hover 상태를 false로 내려버려서, 드래그를 놓는
      // 순간 `forceOpen || isResizing || isHoverOpen`이 모두 false가 되어 패널이 닫혔다.
    >
      {/* NOTE: resize 핸들은 flyout 최상위에 둔다. 과거에는 콘텐츠 wrapper 안에 있어서
          그 wrapper 높이만큼만 잡혔고, 상단 여백(spacer) 구간에서는 드래그가 안 됐다.
          FocusHoverSidebar의 컨테이너가 `position: fixed`라 absolute 기준이 되며,
          `left-0`는 flyout(=패널) 왼쪽 경계, `inset-y-0`는 전체 높이를 뜻한다.
          out-of-flow라 shrink-to-fit 폭 계산에도 영향을 주지 않는다. */}
      {activeCompactTab !== null && (
        <div
          role="separator"
          aria-orientation="vertical"
          className="absolute inset-y-0 left-0 z-30 w-2 cursor-col-resize bg-transparent"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onLostPointerCapture={endResize}
        />
      )}
      {/* NOTE: traffic lights 공간만큼 상단 여백을 줘 내용이 표면 확장에 따라 올라가지 않게 한다. */}
      <div style={{ height: sidebarTopOffset }} aria-hidden="true" className="shrink-0" />
      <div className="flex-1 min-h-0 flex flex-row">
        <div
          ref={panelElementRef}
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
                        />
                      </Suspense>
                    </div>
                  </>
                ) : (
                  <>
                    {!hasOwnPanelHeader && (
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
                    )}
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
