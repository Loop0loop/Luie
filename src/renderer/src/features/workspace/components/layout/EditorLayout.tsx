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
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import { BinderBarCompactHover } from "@renderer/features/workspace/components/BinderBarCompactHover";
import { EDITOR_WINDOW_BAR_HEIGHT_PX } from "@renderer/shared/constants/editorLayout";
import { DEFAULT_EDITOR_MAX_WIDTH } from "@shared/constants/app/configs";
import { SIDEBAR_WIDTH_CONFIG, toPercentSize } from "@renderer/shared/constants/sidebarSizing";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { getPanelLayoutValue } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { cn } from "@shared/types/utils";

const IS_MACOS = navigator.userAgent.toLowerCase().includes("mac");

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
  additionalPanelIds = [],
}: EditorLayoutProps) {
  const maxWidth = useEditorStore((state) => state.maxWidth);
  const updatePanelSize = useUIStore((state) => state.updatePanelSize);

  const editorLayoutGroupRef = useRef<HTMLDivElement>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);
  const [isToolbarHoverZoneActive, setIsToolbarHoverZoneActive] = useState(false);
  const toolbarHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // NOTE: 수렴 보장용 watchdog. 이벤트 조합이 어떻게 꼬여도(arm 누락 등) 표시 상태에서
  // 주기적으로 실측 플래그를 확인해 밖이면 숨긴다. 내부면 유지(DnD 중 요구사항).
  useEffect(() => {
    if (!isToolbarVisible) return undefined;
    const id = window.setInterval(() => {
      if (!pointerInClusterRef.current) {
        setIsToolbarVisible(false);
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [isToolbarVisible]);

  const scheduleHide = useCallback(() => {
    if (toolbarHideTimerRef.current !== null) {
      clearTimeout(toolbarHideTimerRef.current);
      toolbarHideTimerRef.current = null;
    }
    setIsToolbarHoverZoneActive(false);
    toolbarHideTimerRef.current = setTimeout(() => {
      toolbarHideTimerRef.current = null;
      // NOTE: 발화 시점에 포인터가 여전히 클러스터 안이면(leave 오발 보정) 숨기지 않는다.
      if (pointerInClusterRef.current) return;
      setIsToolbarVisible(false);
    }, 220);
  }, []);

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
                  ⚠️ 이 밴드에 WebkitAppRegion: "drag"를 동적으로 걸지 않는다. drag 영역은
                  공식 문서 기준 모든 pointer 이벤트를 흡수하고(mouseenter 포함), 캔버스
                  진입처럼 툴바가 보인 상태에서 라우트가 교체되면 흡수 상태가 상단 스트립에
                  남아 복귀 후 hover가 죽는 원인이 된다. 창 드래그는 좌우 고정 그립으로만
                  제공한다(사용자 요구: 툴바 버튼은 DnD 무관, 빈 공간만 DnD). */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 z-30 h-11 pointer-events-auto"
                onMouseEnter={handleToolbarEnter}
                onMouseLeave={scheduleHide}
              />

              {/* NOTE: 리본(밴드+portal 컨트롤)은 항상 마운트 유지한다. 매 hover마다
                  Ribbon/EditorToolbar를 remount하면 ResizeObserver·ghost 에디터 같은
                  무거운 리소스가 재생성되고 fade-out을 낼 수 없다. portal 컨트롤은 DOM상
                  자식이 아니므로 isVisible 플래그로 같이 전환한다.
                  ⚠️ 이 래퍼에 translate를 걸면 portal 좌표(anchor getBoundingClientRect)가
                  밀려 툴바가 위로 굳는다. opacity/pointer-events 전용으로 전환한다. */}
              <div
                data-editor-toolbar-band="true"
                className={cn(
                  "absolute inset-x-0 top-0 z-40 transition-opacity duration-150 ease-out",
                  isToolbarVisible ? "opacity-100" : "opacity-0 pointer-events-none",
                )}
                onMouseEnter={handleToolbarEnter}
                onMouseLeave={scheduleHide}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-10"
                  style={{ WebkitAppRegion: "drag" } as CSSProperties}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-y-0 right-0 w-10"
                  style={{ WebkitAppRegion: "drag" } as CSSProperties}
                />
                <Ribbon
                  editor={editor}
                  onOpenSettings={onOpenSettings}
                  activeChapterId={activeChapterId}
                  onOpenExportPreview={onOpenExport}
                  onOpenWorldGraph={onOpenWorldGraph}
                  toolbarVisible={isToolbarVisible}
                  onControlsEnter={showToolbar}
                  onControlsLeave={scheduleHide}
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
