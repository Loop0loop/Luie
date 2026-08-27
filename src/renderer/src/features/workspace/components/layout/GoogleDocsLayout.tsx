import { useRef } from "react";
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
import { GoogleDocsEditorColumn } from "./GoogleDocsEditorColumn";
import { GoogleDocsHeader } from "./GoogleDocsHeader";
import { GoogleDocsPanelRail } from "./GoogleDocsPanelRail";
import { GoogleDocsRightPanel } from "./GoogleDocsRightPanel";
import type { GoogleDocsLayoutProps } from "./googleDocsLayout.types";
import { useGoogleDocsLayoutState } from "./useGoogleDocsLayoutState";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useEditorStore } from "@renderer/domains/editor";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";
import { cn } from "@shared/types/utils";

const isMacOS = navigator.userAgent.toLowerCase().includes("mac");

export function GoogleDocsLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  activeChapterContent,
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
    docsSidebarConfig,
    docsSidebarRatio,
    handleRightTabClick,
    isSidebarOpen,
    onRightLayoutChanged,
    onSidebarLayoutChanged,
    pageMargins,
    rightPanelConfig,
    rightPanelRatio,
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
  const docsSidebarSize = getResponsivePanelSize(
    docsLayoutGroupWidth,
    docsSidebarConfig,
  );
  const rightPanelSize = rightPanelConfig
    ? getResponsivePanelSize(docsLayoutGroupWidth, rightPanelConfig)
    : null;
  const safeDocsSidebarRatio =
    typeof docsSidebarRatio === "number" &&
    Number.isFinite(docsSidebarRatio) &&
    docsSidebarRatio >= 5
      ? docsSidebarRatio
      : getLayoutSurfaceDefaultRatio("docs.sidebar");
  const {
    isClosing: isSidebarClosing,
    isOpening: isSidebarOpening,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: toPanelPercentSize(safeDocsSidebarRatio),
    panelRef: docsSidebarPanelRef,
  });

  return (
    <div className="relative flex h-screen bg-app font-sans text-fg transition-colors duration-200">
      <PanelGroup
        orientation="horizontal"
        className="relative flex h-full w-full overflow-hidden bg-sidebar"
        id="docs-layout-group"
        elementRef={docsLayoutGroupRef}
        onLayoutChanged={onSidebarLayoutChanged}
      >
        {/* NOTE: collapsible Panel은 drag로 minSize 밑으로 줄면 collapsedSize로 스냅되어
            사이드바가 숨겨진다. minPx를 하드 플로어로 유지하려면 우측 패널과 동일하게
            collapsible 없이 열림 상태로 조건부 렌더링한다. 열림/닫힘 transition 중에만
            minSize를 완화(0%)해 flex-grow가 0까지 보간되게 한다. */}
        {shouldRenderSidebar && (
          <>
            <Panel
              id="left-sidebar"
              panelRef={docsSidebarPanelRef}
              data-panel-animated={
                isSidebarOpening || isSidebarClosing ? "true" : undefined
              }
              defaultSize={toPanelPercentSize(safeDocsSidebarRatio)}
              minSize={
                isSidebarOpening || isSidebarClosing
                  ? "0%"
                  : docsSidebarSize.minSize
              }
              maxSize={docsSidebarSize.maxSize}
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

            <PanelResizeHandle
              data-separator-feature="docs.sidebar"
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
              activeRightTab === "analysis"
                ? "bg-gradient-to-r from-sidebar from-50% to-[#323232] to-50%"
                : "bg-gradient-to-r from-sidebar from-50% to-[#212123] to-50%",
            )}
            id="docs-content-group"
            onLayoutChanged={onRightLayoutChanged}
          >
            <Panel
              id="docs-center-shell"
              minSize={toPanelPercentSize(10)}
              className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-app"
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
              activeChapterContent={activeChapterContent}
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
