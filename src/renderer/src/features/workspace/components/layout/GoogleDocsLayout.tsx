import { useEffect, useRef } from "react";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
} from "react-resizable-panels";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getLayoutSurfaceDefaultRatio,
  getResponsivePanelSize,
  toPanelPercentSize,
} from "@renderer/shared/constants/layoutSizing";
import {
  getSidebarWidthConfig,
  toPxSize,
} from "@renderer/shared/constants/sidebarSizing";
import { GoogleDocsEditorColumn } from "./GoogleDocsEditorColumn";
import { GoogleDocsHeader } from "./GoogleDocsHeader";
import { GoogleDocsPanelRail } from "./GoogleDocsPanelRail";
import { GoogleDocsRightPanel } from "./GoogleDocsRightPanel";
import type { GoogleDocsLayoutProps } from "./googleDocsLayout.types";
import { useGoogleDocsLayoutState } from "./useGoogleDocsLayoutState";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useEditorStore } from "@renderer/domains/editor";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";
import { beginLayoutRestoring } from "@renderer/features/workspace/hooks/useProjectLayoutPersistence";
import { cn } from "@shared/types/utils";

const isMacOS = navigator.userAgent.toLowerCase().includes("mac");

export function GoogleDocsLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  currentProjectId,
  editor,
  onOpenSettings,
  onRenameChapter,
  onSaveChapter,
  additionalPanels,
  additionalPanelIds = [],
  isMobileView = false,
  onToggleMobileView,
  onOpenExport,
  onOpenWorldGraph,
}: GoogleDocsLayoutProps) {
  const { t } = useTranslation();
  const {
    activePanelSurface,
    activeRightTab,
    closeRightPanel,
    handleRightTabClick,
    docsSidebarWidthPx,
    isSidebarOpen,
    onRightLayoutChanged,
    pageMargins,
    rightPanelConfig,
    rightPanelRatio,
    sidebarResize,
    setDocsSidebarOpen,
    setFocusedClosableTarget,
    setPageMargins,
    setTrashRefreshKey,
    trashRefreshKey,
  } = useGoogleDocsLayoutState(currentProjectId ?? null);
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const docsLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const docsSidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const docsLayoutGroupWidth = useElementWidth(docsLayoutGroupRef);
  const rightPanelSize = rightPanelConfig
    ? getResponsivePanelSize(docsLayoutGroupWidth, rightPanelConfig)
    : null;
  // NOTE: min/max/기본값 모두 px 상수에서 그대로 온다. react-resizable-panels는 px 문자열을
  // 네이티브로 해석하므로(`ie()`의 "px" 분기) ratio로 변환할 이유가 없다.
  const docsSidebarWidthConfig = getSidebarWidthConfig("docsBinder");
  const docsSidebarOpenSize = toPxSize(docsSidebarWidthPx);
  const {
    isClosing: isSidebarClosing,
    isOpening: isSidebarOpening,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: docsSidebarOpenSize,
    panelRef: docsSidebarPanelRef,
  });

  // NOTE: 닫았다 열면 Panel이 remount되어 `defaultSize`가 저장 px으로 다시 읽힌다. 하지만
  // 새로고침/재시작 경로는 그것만으로 부족하다. project layout restore가 이 컴포넌트 mount
  // 뒤에 저장 px을 채우고, 이미 mount된 Panel은 `defaultSize` 변경을 읽지 않기 때문이다.
  // 그래서 열려 있고 transition 중이 아닐 때는 panel handle로도 저장 px을 적용한다.
  // `beginLayoutRestoring()`으로 감싸야 이 프로그램적 resize가 저장 폭으로 커밋되지 않는다.
  const isSidebarSettled =
    shouldRenderSidebar && !isSidebarOpening && !isSidebarClosing;
  useEffect(() => {
    if (!isSidebarSettled) return undefined;
    const panel = docsSidebarPanelRef.current;
    if (!panel) return undefined;

    const endRestoring = beginLayoutRestoring();
    const frameId = requestAnimationFrame(() => {
      try {
        panel.resize(docsSidebarOpenSize);
      } catch {
        // Panel이 아직 group layout에 등록되지 않은 프레임에서는 resize가 throw한다.
        // 이 시점에는 mount 시 defaultSize가 같은 값이므로 무시한다.
      }
      endRestoring();
    });

    return () => {
      cancelAnimationFrame(frameId);
      endRestoring();
    };
  }, [docsSidebarOpenSize, isSidebarSettled]);

  return (
    <div className="relative flex h-screen bg-app font-sans text-fg transition-colors duration-200">
      <PanelGroup
        orientation="horizontal"
        className="relative flex h-full w-full overflow-hidden bg-sidebar"
        id="docs-layout-group"
        elementRef={docsLayoutGroupRef}
      >
        {/* NOTE: collapsible Panel은 drag로 minSize 밑으로 줄면 collapsedSize로 스냅되어
            사이드바가 숨겨진다. minPx를 하드 플로어로 유지하려면 우측 패널과 동일하게
            collapsible 없이 열림 상태로 조건부 렌더링한다. 열림/닫힘 transition 중에만
            minSize를 완화(0px)해 flex-grow가 0까지 보간되게 한다.
            `preserve-pixel-size`는 창 폭이 바뀌어도 사이드바 px을 유지시킨다. 그룹에 상대
            크기 패널이 최소 하나 필요한데 `docs-main-shell`이 그 역할을 한다. */}
        {shouldRenderSidebar && (
          <>
            <Panel
              id="left-sidebar"
              panelRef={docsSidebarPanelRef}
              groupResizeBehavior="preserve-pixel-size"
              onResize={sidebarResize.onResize}
              data-panel-animated={
                isSidebarOpening || isSidebarClosing ? "true" : undefined
              }
              defaultSize={docsSidebarOpenSize}
              minSize={
                isSidebarOpening || isSidebarClosing
                  ? "0px"
                  : toPxSize(docsSidebarWidthConfig.minPx)
              }
              maxSize={toPxSize(docsSidebarWidthConfig.maxPx)}
              className={`flex min-w-0 shrink-0 flex-col bg-sidebar ${
                enableAnimations
                  ? isSidebarClosing
                    ? "animate-out slide-out-to-left fade-out duration-200"
                    : isSidebarOpen
                      ? "animate-in slide-in-from-left fade-in duration-200"
                      : ""
                  : ""
              }`}
            >
              <div className="flex h-full flex-col overflow-hidden bg-sidebar">
                <div className="mt-10 flex h-16 shrink-0 items-center px-3">
                  <button
                    onClick={() => setDocsSidebarOpen(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover"
                    title={t("sidebar.toggle.close")}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">{sidebar}</div>
              </div>
            </Panel>

            {/* NOTE: `resizeHandleProps`가 "사용자가 핸들을 잡았다"는 신호를 만든다. 이게
                없으면 `useSidebarResizeCommit`이 모든 resize를 프로그램적 변화로 보고 아무
                폭도 저장하지 않는다. */}
            <PanelResizeHandle
              data-separator-feature="docs.sidebar"
              {...sidebarResize.resizeHandleProps}
              className="relative z-20 w-1 shrink-0 cursor-col-resize bg-sidebar"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </PanelResizeHandle>
          </>
        )}

        <Panel
          id="docs-main-shell"
          minSize={toPanelPercentSize(10)}
          className="flex min-w-0 flex-1 bg-sidebar"
        >
          <PanelGroup
            orientation="horizontal"
            className={cn(
              "relative flex h-full min-w-0 flex-1 overflow-hidden transition-colors duration-150",
              // NOTE: 이전에는 dark token 값을 literal로 복제해 light·sepia에서도 우측
              // 절반이 dark로 남았다. 우측 stop은 그 자리에 오는 패널 표면을 따라간다.
              activeRightTab === "analysis"
                ? "bg-linear-to-r from-sidebar from-50% to-ai-panel to-50%"
                : "bg-linear-to-r from-sidebar from-50% to-research to-50%",
            )}
            id="docs-content-group"
            onLayoutChanged={onRightLayoutChanged}
          >
            <Panel
              id="docs-center-shell"
              minSize={toPanelPercentSize(10)}
              className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-editor-shell bg-app"
            >
              {/* NOTE: 열기 버튼은 사이드바 닫기 버튼(패널 좌측 상단 px-3, mt-10+h-16 중앙 =
                  12px, 52px)과 같은 자리에 둬야 토글 시 버튼이 점프하지 않는다. 이 Panel은
                  헤더보다 상위 레벨이므로 헤더 높이(88px)만큼의 오프셋 없이 배치할 수 있다. */}
              {!isSidebarOpen && (
                <div className="pointer-events-auto absolute left-3 top-[52px] z-50 animate-in fade-in duration-200">
                  <button
                    onClick={() => setDocsSidebarOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-hover"
                    title={t("sidebar.toggle.open")}
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                </div>
              )}

              <GoogleDocsHeader
                activeChapterId={activeChapterId}
                activeChapterTitle={activeChapterTitle}
                activeRightTab={activeRightTab}
                onOpenSettings={onOpenSettings}
                onRenameChapter={onRenameChapter}
                onRightTabClick={handleRightTabClick}
                reserveTrafficLightsSpace={isMacOS && !isSidebarOpen}
              />

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <GoogleDocsEditorColumn
                  additionalPanelIds={additionalPanelIds}
                  additionalPanels={additionalPanels}
                  activeChapterId={activeChapterId}
                  editor={editor}
                  isMobileView={isMobileView}
                  onToggleMobileView={onToggleMobileView}
                  onOpenExport={onOpenExport}
                  onOpenWorldGraph={onOpenWorldGraph}
                  pageMargins={pageMargins}
                  setPageMargins={setPageMargins}
                >
                  {children}
                </GoogleDocsEditorColumn>
              </div>
            </Panel>

            <GoogleDocsRightPanel
              activeChapterId={activeChapterId}
              activeChapterTitle={activeChapterTitle}
              activePanelSurface={activePanelSurface}
              activeRightTab={activeRightTab}
              closeRightPanel={closeRightPanel}
              currentProjectId={currentProjectId}
              onFocus={() => setFocusedClosableTarget({ kind: "docs-tab" })}
              onRefreshTrash={() =>
                setTrashRefreshKey((current) => current + 1)
              }
              onSaveChapter={onSaveChapter}
              rightPanelSize={rightPanelSize}
              rightPanelRatio={
                typeof rightPanelRatio === "number" &&
                Number.isFinite(rightPanelRatio) &&
                rightPanelRatio >= 5
                  ? rightPanelRatio
                  : (activePanelSurface ? getLayoutSurfaceDefaultRatio(activePanelSurface) : 36)
              }
              trashRefreshKey={trashRefreshKey}
            />
          </PanelGroup>

          <GoogleDocsPanelRail
            activeRightTab={activeRightTab}
            onSelectTab={handleRightTabClick}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
}

export default GoogleDocsLayout;
