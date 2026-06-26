import { useRef } from "react";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
  type PanelSize,
} from "react-resizable-panels";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import { getResponsivePanelSize, toPanelPercentSize } from "@renderer/shared/constants/layoutSizing";
import { GoogleDocsEditorColumn } from "./GoogleDocsEditorColumn";
import { GoogleDocsHeader } from "./GoogleDocsHeader";
import { GoogleDocsPanelRail } from "./GoogleDocsPanelRail";
import { GoogleDocsRightPanel } from "./GoogleDocsRightPanel";
import type { GoogleDocsLayoutProps } from "./googleDocsLayout.types";
import { useGoogleDocsLayoutState } from "./useGoogleDocsLayoutState";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";
import { useEditorStore } from "@renderer/domains/editor";
import { useResizablePanelPresence } from "@renderer/features/workspace/hooks/useResizablePanelPresence";
import { suppressLayoutPersistenceFor } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { SidebarHoverStrip } from "@renderer/features/workspace/components/SidebarHoverStrip";

export default function GoogleDocsLayout({
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
    isPanelRailOpen,
    isSidebarOpen,
    onLayoutChanged,
    pageMargins,
    rightPanelConfig,
    rightPanelRatio,
    setDocsSidebarOpen,
    setFocusedClosableTarget,
    setPageMargins,
    setPanelRailOpen,
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
  const {
    isClosing: isSidebarClosing,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: toPanelPercentSize(docsSidebarRatio),
    panelRef: docsSidebarPanelRef,
  });
  const handleSidebarResize = (panelSize: PanelSize) => {
    const isCollapsed =
      panelSize.asPercentage <= 0.1 || panelSize.inPixels <= 1;
    if (isCollapsed) {
      suppressLayoutPersistenceFor(500);
      setDocsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-app font-sans text-fg transition-colors duration-200">
      <div className="bg-app transition-colors duration-200">
        <WindowBar />
      </div>

      <GoogleDocsHeader
        activeChapterId={activeChapterId}
        activeChapterTitle={activeChapterTitle}
        activeRightTab={activeRightTab}
        isSidebarOpen={isSidebarOpen}
        onOpenSettings={onOpenSettings}
        onRenameChapter={onRenameChapter}
        onRightTabClick={handleRightTabClick}
        onToggleSidebar={setDocsSidebarOpen}
      />

      <div className="relative flex flex-1 flex-row overflow-hidden">
        {!shouldRenderSidebar && !isPanelRailOpen && !activeRightTab && sidebar && (
          <SidebarHoverStrip onExpand={() => setDocsSidebarOpen(true)}>
            {sidebar}
          </SidebarHoverStrip>
        )}

        {!isSidebarOpen && !shouldRenderSidebar && (
          <div className="pointer-events-auto absolute left-4 top-4 z-50">
            <button
              onClick={() => setDocsSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-control border border-border bg-app text-muted shadow-sm transition-colors duration-150 hover:bg-surface-hover"
              title={t("sidebar.toggle.open")}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        )}

        <PanelGroup
          orientation="horizontal"
          className="relative flex h-full w-full flex-1 overflow-hidden"
          id="docs-layout-group"
          elementRef={docsLayoutGroupRef}
          onLayoutChanged={onLayoutChanged}
        >
          {shouldRenderSidebar && (
            <>
              <Panel
                id="left-sidebar"
                panelRef={docsSidebarPanelRef}
                collapsible
                collapsedSize={0}
                data-panel-animated="true"
                defaultSize={toPanelPercentSize(docsSidebarRatio)}
                minSize={docsSidebarSize.minSize}
                maxSize={docsSidebarSize.maxSize}
                onResize={handleSidebarResize}
                className={`flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-border bg-app ${
                  enableAnimations
                    ? isSidebarClosing
                      ? "animate-out slide-out-to-left fade-out duration-200"
                      : "animate-in slide-in-from-left fade-in duration-200"
                    : ""
                }`}
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle
                data-separator-feature="docs.sidebar"
                className="relative z-20 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          <GoogleDocsEditorColumn
            additionalPanelIds={additionalPanelIds}
            additionalPanels={additionalPanels}
            editor={editor}
            onOpenExport={onOpenExport}
            onOpenWorldGraph={onOpenWorldGraph}
            pageMargins={pageMargins}
            setPageMargins={setPageMargins}
          >
            {children}
          </GoogleDocsEditorColumn>

          <GoogleDocsRightPanel
            activeChapterContent={activeChapterContent}
            activeChapterId={activeChapterId}
            activeChapterTitle={activeChapterTitle}
            activePanelSurface={activePanelSurface}
            activeRightTab={activeRightTab}
            closeRightPanel={closeRightPanel}
            currentProjectId={currentProjectId}
            onFocus={() => setFocusedClosableTarget({ kind: "docs-tab" })}
            onRefreshTrash={() => setTrashRefreshKey((current) => current + 1)}
            onSaveChapter={onSaveChapter}
            rightPanelSize={rightPanelSize}
            rightPanelRatio={rightPanelRatio ?? 0}
            trashRefreshKey={trashRefreshKey}
          />

          {!shouldRenderSidebar && !activeRightTab && (
            <Panel
              id="docs-layout-placeholder"
              defaultSize={0}
              minSize={0}
              maxSize={0}
              className="pointer-events-none overflow-hidden opacity-0"
            />
          )}
        </PanelGroup>

        <GoogleDocsPanelRail
          activeRightTab={activeRightTab}
          isOpen={isPanelRailOpen}
          onSelectTab={handleRightTabClick}
          onToggleOpen={setPanelRailOpen}
        />
      </div>
    </div>
  );
}
