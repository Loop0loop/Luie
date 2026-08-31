import {
  type CSSProperties,
  type ReactNode,
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import { type Editor } from "@tiptap/react";
import { Panel, Group as PanelGroup, type Layout } from "react-resizable-panels";
import { Ribbon, useEditorStore } from "@renderer/domains/editor";
import { FocusHoverSidebar } from "@renderer/domains/manuscript";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { api } from "@shared/api";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { BinderBarCompactHover } from "@renderer/features/workspace/components/BinderBarCompactHover";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@renderer/shared/constants/editorLayout";
import { DEFAULT_EDITOR_MAX_WIDTH } from "@shared/constants/app/configs";
import { SIDEBAR_WIDTH_CONFIG, toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { getPanelLayoutValue } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { cn } from "@shared/types/utils";

const IS_MACOS = navigator.userAgent.toLowerCase().includes("mac");
// NOTE: 기본값을 inline `[]`로 두면 매 render마다 새 배열이 되어 이 값을 dependency로 쓰는
// `handleEditorLayoutChanged`가 계속 재생성된다(MainLayout과 동일한 이유).
const EMPTY_PANEL_IDS: readonly string[] = [];

/**
 * 트래픽 라이트 표시를 요청한다. 없으면 조용히 건너뛴다.
 *
 * preload는 렌더러와 별개 번들이라 dev HMR로 갱신되지 않는다. 메서드를 새로 추가한 직후
 * 앱을 재시작하기 전까지 실행 중인 preload에는 그 메서드가 없고, 그대로 호출하면 effect에서
 * TypeError가 나 EditorLayout 전체가 error boundary로 떨어진다. 창 크롬 장식은 실패해도
 * 편집을 막을 이유가 없으므로 capability 유무를 확인하고 넘어간다.
 * (타입상으로는 항상 존재하므로 이 가드는 런타임 버전 스큐 전용이다.)
 */
const applyTrafficLightVisibility = (visible: boolean): void => {
  if (typeof api.window.setTrafficLightVisibility !== "function") return;
  void api.window.setTrafficLightVisibility(visible);
};

interface EditorLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  currentProjectId?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onOpenExport?: () => void;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  onOpenWorldGraph?: () => void;
}

export default function EditorLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  currentProjectId,
  editor,
  onOpenSettings,
  onOpenExport,
  onOpenWorldGraph,
  additionalPanels,
  additionalPanelIds = EMPTY_PANEL_IDS as string[],
}: EditorLayoutProps) {
  const maxWidth = useEditorStore((state) => state.maxWidth);
  const updatePanelSize = useUIStore((state) => state.updatePanelSize);
  // NOTE: 챕터 ⋮ 메뉴는 body로 portal되어 사이드바 rect 밖에 뜬다. 메뉴로 포인터를 옮기는
  // 순간 hover-close가 걸리면 메뉴를 조작할 수 없으므로 열려 있는 동안 닫기를 잠근다.
  const isManuscriptMenuOpen = useUIStore((state) => state.isManuscriptMenuOpen);

  const editorLayoutGroupRef = useRef<HTMLDivElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isToolbarHoverZoneActive, setIsToolbarHoverZoneActive] = useState(false);
  const toolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // NOTE: 툴바 메뉴("...")는 툴바 레이어 안에 렌더되므로 툴바가 숨으면 메뉴까지 사라진다.
  // 열려 있는 동안은 포인터가 클러스터를 벗어나도 툴바를 유지한다. state가 아니라 ref인
  // 이유는 hover 판정이 timer/interval 안에서 최신값만 읽으면 되고, 리렌더가 필요 없기
  // 때문이다.
  const toolbarMenuOpenRef = useRef(false);

  const showToolbar = useCallback(() => {
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
    setIsToolbarVisible(true);
  }, []);

  // NOTE: leave 이벤트가 드래그 그립/drag 영역/portal 경계에서 누락·오발되면 툴바가
  // 스스로 사라진다(idle 자기소멸, DnD 중 소멸). pointermove로 클러스터 내부 여부를
  // 항상 추적하고, hide 예약 발화 시점에 "실제로 밖인지" 재검증해 판정한다.
  const isPointerInToolbarCluster = useCallback(
    (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          '[data-editor-toolbar-band="true"], [data-editor-toolbar-layer="true"]',
        ),
      );
    },
    [],
  );
  // NOTE: 최신 포인터 위치 기준의 클러스터 내부 여부. leave 누락/오발 시에도
  // 실제 위치로 재판정하기 위한 값이다.
  const pointerInClusterRef = useRef(false);

  // NOTE: 창 드래그 중에는 포인터 이벤트가 OS에 흡수되고, 놓은 뒤에는 경계 이벤트 없이
  // target이 점프한다. leave 이벤트만으로는 arm이 누락되므로(move/over/down 전부)
  // 어떤 활동이든 들어오면 최신 위치로 판정값을 갱신하고, 밖이면 예약된 숨김을 유지한다.
  const syncPointerCluster = useCallback(
    (event: PointerEvent) => {
      pointerInClusterRef.current = isPointerInToolbarCluster(event.target);
    },
    [isPointerInToolbarCluster],
  );

  useEffect(() => {
    const options = { passive: true } as const;
    window.addEventListener("pointermove", syncPointerCluster, options);
    window.addEventListener("pointerover", syncPointerCluster, options);
    window.addEventListener("pointerdown", syncPointerCluster, options);
    return () => {
      window.removeEventListener("pointermove", syncPointerCluster);
      window.removeEventListener("pointerover", syncPointerCluster);
      window.removeEventListener("pointerdown", syncPointerCluster);
    };
  }, [syncPointerCluster]);

  // NOTE: 툴바를 유지할 근거는 두 가지다 — 포인터가 클러스터 안이거나, 툴바 메뉴가 열려
  // 있는 경우. 숨김 경로(예약 timeout / watchdog)가 모두 같은 판정을 쓰게 한 곳에 둔다.
  const shouldKeepToolbarVisible = useCallback(
    () => pointerInClusterRef.current || toolbarMenuOpenRef.current,
    [],
  );

  // NOTE: 수렴 보장용 watchdog. 이벤트 조합이 어떻게 꼬여도(arm 누락 등) 표시 상태에서
  // 주기적으로 실측 플래그를 확인해 밖이면 숨긴다. 내부면 유지(DnD 중 요구사항).
  useEffect(() => {
    if (!isToolbarVisible) return undefined;
    const id = window.setInterval(() => {
      if (!shouldKeepToolbarVisible()) {
        setIsToolbarVisible(false);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [isToolbarVisible, shouldKeepToolbarVisible]);

  const scheduleHide = useCallback(() => {
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
    setIsToolbarHoverZoneActive(false);
    toolbarHideTimerRef.current = setTimeout(() => {
      toolbarHideTimerRef.current = null;
      // NOTE: 발화 시점에 포인터가 여전히 클러스터 안이면(leave 오발 보정) 숨기지 않는다.
      if (shouldKeepToolbarVisible()) return;
      setIsToolbarVisible(false);
    }, 220);
  }, [shouldKeepToolbarVisible]);

  // NOTE: 메뉴가 열리는 순간 예약된 숨김이 남아 있을 수 있으므로 showToolbar로 취소한다.
  const handleToolbarMenuOpenChange = useCallback(
    (open: boolean) => {
      toolbarMenuOpenRef.current = open;
      if (open) {
        showToolbar();
      }
    },
    [showToolbar],
  );

  const handleToolbarEnter = useCallback(() => {
    setIsToolbarHoverZoneActive(true);
    showToolbar();
  }, [showToolbar]);

  const editorLayoutGroupWidth = useElementWidth(editorLayoutGroupRef);

  const handleEditorLayoutChanged = useCallback(
    (layout: Layout) => {
      additionalPanelIds.forEach((panelId, panelIndex) => {
        const rawSize = getPanelLayoutValue(layout, panelId, panelIndex + 1);
        if (typeof rawSize !== "number" || !Number.isFinite(rawSize)) return;
        updatePanelSize(panelId, rawSize);
      });
    },
    [additionalPanelIds, updatePanelSize],
  );

  useEffect(
    () => () => {
      if (toolbarHideTimerRef.current !== null) {
        clearTimeout(toolbarHideTimerRef.current);
        toolbarHideTimerRef.current = null;
      }
    },
    [],
  );

  // NOTE: 드래그 밴드 위에서는 pointer 이벤트가 끊기므로, 그 상태로 창 포커스를 잃으면
  // 클러스터 판정이 "내부"로 고착돼 툴바가 남는다. blur를 명시적 이탈로 취급한다.
  useEffect(() => {
    const handleWindowBlur = () => {
      pointerInClusterRef.current = false;
      setIsToolbarVisible(false);
    };
    window.addEventListener("blur", handleWindowBlur);
    return () => window.removeEventListener("blur", handleWindowBlur);
  }, []);

  // NOTE: 트래픽 라이트는 창 전역 상태다. macOS에서만 툴바 hover에 맞춰 켜고 끈다.
  useEffect(() => {
    if (!IS_MACOS) return;
    applyTrafficLightVisibility(isToolbarVisible);
  }, [isToolbarVisible]);

  // NOTE: 이 레이아웃을 벗어날 때(uiMode 전환·캔버스 진입으로 unmount) 반드시 되돌린다.
  // 안 되돌리면 다른 레이아웃에서 트래픽 라이트가 영구히 사라진다.
  useEffect(() => {
    if (!IS_MACOS) return undefined;
    return () => {
      applyTrafficLightVisibility(true);
    };
  }, []);

  const sidebarTopOffset = IS_MACOS ? EDITOR_WINDOW_BAR_HEIGHT_PX : 0;
  // NOTE: research 사이드바/레일의 표면(배경)은 traffic lights 끝까지 확장하고,
  // 실제 콘텐츠는 기존 오프셋 아래에 유지한다. 표면 확장과 내용 위치를 분리한다.
  const sidebarSurfaceTopOffset = 0;

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative">
      <div className="flex-1 overflow-hidden relative flex flex-row">
        <FocusHoverSidebar
          side="left"
          topOffset={sidebarSurfaceTopOffset}
          activationWidthPx={SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx}
          closeDelayMs={180}
          suppressHoverOpen={isToolbarHoverZoneActive}
          suppressHoverClose={isManuscriptMenuOpen}
        >
          <div
            className="h-full flex flex-col bg-sidebar border-r border-border"
            style={{ minWidth: SIDEBAR_WIDTH_CONFIG.mainSidebar.minPx }}
          >
            {/* NOTE: traffic lights 공간만큼 상단 여백을 줘 내용이 표면 확장에 따라 올라가지 않게 한다. */}
            <div className="shrink-0" style={{ height: sidebarTopOffset }} aria-hidden="true" />
            <div className="flex-1 min-h-0 flex flex-col">{sidebar}</div>
          </div>
        </FocusHoverSidebar>

        <div
          className={cn(
            "relative flex h-full flex-1 flex-row overflow-hidden",
            additionalPanelIds.length > 0 && "bg-research",
          )}
        >

          <PanelGroup
            orientation="horizontal"
            className={`relative flex h-full w-full flex-1 overflow-hidden ${
              additionalPanelIds.length > 0 ? "bg-research" : ""
            }`}
            id="editor-layout-group"
            elementRef={editorLayoutGroupRef}
            onLayoutChanged={handleEditorLayoutChanged}
          >
            <Panel
              id="main-editor-view"
              minSize={toPercentSize(10)}
              className="min-w-0 bg-transparent relative flex flex-col"
            >
              {/* NOTE: 툴바(hover 존)를 에디터 Panel 안으로 스코프해 portal 툴바가
                  research 패널 위까지 덮지 않게 한다.
                  이 센티넬은 반드시 no-drag로 남겨야 한다. Electron 공식 문서 기준 드래그
                  영역은 모든 pointer 이벤트를 무시하므로(mouseenter 포함), 숨김 상태에서
                  drag를 걸면 툴바를 띄울 hover를 감지할 수 없다.
                  `data-editor-toolbar-band`를 붙여 클러스터 판정에 포함시킨다. 툴바가 뜬 뒤
                  밴드가 drag로 바뀌면 그 위에서 이벤트가 끊기는데, 마지막 판정이 "내부"로
                  남아 있어야 watchdog이 툴바를 곧바로 내려버리지 않는다. */}
              {/* NOTE: 배경이 필요하다. 이 센티넬은 아래 `overflow-y-scroll` 컨테이너 위에
                  겹쳐 있어서, 투명하면 스크롤된 본문 글자가 상단 44px에 비쳐 보인다. 그 위로
                  `z-40` 리본 밴드(`bg-panel`)가 opacity로 토글되며 비친 글자를 덮었다 열었다
                  해서 Sepia처럼 panel/app 대비가 좁은 theme에서 띠가 점멸했다.
                  스크롤 표면과 같은 `bg-app`을 줘야 이음선 없이 가려진다. */}
              <div
                aria-hidden="true"
                data-editor-toolbar-band="true"
                className="absolute inset-x-0 top-0 z-30 h-11 bg-app pointer-events-auto"
                onMouseEnter={handleToolbarEnter}
                onMouseLeave={scheduleHide}
              />

              {/* NOTE: 리본(밴드+portal 컨트롤)은 항상 마운트 유지한다. 매 hover마다
                  Ribbon/EditorToolbar를 remount하면 ResizeObserver·ghost 에디터 같은
                  무거운 리소스가 재생성되고 fade-out을 낼 수 없다. portal 컨트롤은 DOM상
                  자식이 아니므로 isVisible 플래그로 같이 전환한다.
                  ⚠️ 이 래퍼에 translate를 걸면 portal 좌표(anchor getBoundingClientRect)가
                  밀려 툴바가 위로 굳는다. opacity/pointer-events 전용으로 전환한다. */}
              {/* NOTE: 헤더 = 툴바 영역이 곧 창 드래그 영역이다. 툴바가 보일 때만 drag로
                  전환하고, 숨김 상태에서는 no-drag로 둬야 위 센티넬의 hover가 살아 있다.
                  app-region은 상속되므로(문서의 body/button 예시) 밴드에 drag를 주면 하위가
                  전부 draggable이 되고, EditorToolbar의 컨트롤 클러스터가 no-drag로 스스로를
                  제외해 클릭이 드래그보다 우선한다. 문서 권고대로 이 밴드에는 커스텀 컨텍스트
                  메뉴를 붙이지 않고 select-none(Ribbon)을 유지한다. */}
              <div
                data-editor-toolbar-band="true"
                className={cn(
                  "absolute inset-x-0 top-0 z-40 transition-opacity duration-150 ease-out",
                  isToolbarVisible ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
                onMouseEnter={handleToolbarEnter}
                onMouseLeave={scheduleHide}
                style={
                  {
                    WebkitAppRegion: isToolbarVisible ? "drag" : "no-drag",
                  } as CSSProperties
                }
              >
                <Ribbon
                  editor={editor}
                  onOpenSettings={onOpenSettings}
                  activeChapterId={activeChapterId}
                  onOpenExportPreview={onOpenExport}
                  onOpenWorldGraph={onOpenWorldGraph}
                  toolbarVisible={isToolbarVisible}
                  onControlsEnter={showToolbar}
                  onControlsLeave={scheduleHide}
                  onMenuOpenChange={handleToolbarMenuOpenChange}
                />
              </div>

              <div className="flex-1 h-full overflow-hidden flex flex-col relative">
                <EditorDropZones />

                <div
                  className="flex-1 h-full overflow-y-scroll bg-app flex flex-col items-center custom-scrollbar shrink-0 relative"
                  data-editor-scroll-container="true"
                >
                  <div
                    className="min-h-full bg-transparent text-fg py-12 px-8 transition-all duration-150 ease-out shrink-0"
                    style={{ width: maxWidth ?? DEFAULT_EDITOR_MAX_WIDTH, maxWidth: "100%" }}
                  >
                    {activeChapterTitle && (
                      <h1 className="text-3xl font-bold mb-8 pb-4 border-b border-border/50 text-fg break-all">
                        {activeChapterTitle}
                      </h1>
                    )}

                    <div className="min-h-[500px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] wrap-break-word">
                      {children}
                    </div>
                  </div>

                  <div className="h-12 w-full shrink-0" />
                </div>
              </div>
            </Panel>

            {additionalPanels}

            {additionalPanelIds.length === 0 && (
              <Panel
                id="editor-layout-placeholder"
                defaultSize={0}
                minSize={0}
                maxSize={0}
                className="pointer-events-none overflow-hidden opacity-0"
              />
            )}
          </PanelGroup>

          <BinderBarCompactHover
            activeChapterId={activeChapterId}
            currentProjectId={currentProjectId}
            sidebarTopOffset={sidebarTopOffset}
            suppressHoverOpen={isToolbarHoverZoneActive}
            containerWidthPx={editorLayoutGroupWidth}
          />
        </div>
      </div>
    </div>
  );
}
