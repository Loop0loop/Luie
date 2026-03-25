import { useRef } from "react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import WindowBar from "@renderer/features/workspace/components/WindowBar";
import { getResponsivePanelSize, toPanelPercentSize } from "@shared/constants/layoutSizing";
import { GoogleDocsEditorColumn } from "./GoogleDocsEditorColumn";
import { GoogleDocsHeader } from "./GoogleDocsHeader";
import { GoogleDocsPanelRail } from "./GoogleDocsPanelRail";
import { GoogleDocsRightPanel } from "./GoogleDocsRightPanel";
import type { GoogleDocsLayoutProps } from "./googleDocsLayout.types";
import { useGoogleDocsLayoutState } from "./useGoogleDocsLayoutState";
import { useElementWidth } from "@renderer/features/workspace/hooks/useElementWidth";

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
    setFocusedClosableTarget,
    setPageMargins,
    setPanelRailOpen,
    setRegionOpen,
    setTrashRefreshKey,
    trashRefreshKey,
  } = useGoogleDocsLayoutState();
  const docsLayoutGroupRef = useRef<HTMLDivElement | null>(null);
  const docsLayoutGroupWidth = useElementWidth(docsLayoutGroupRef);
  const docsSidebarSize = getResponsivePanelSize(
    docsLayoutGroupWidth,
    docsSidebarConfig,
  );
  const rightPanelSize = rightPanelConfig
    ? getResponsivePanelSize(docsLayoutGroupWidth, rightPanelConfig)
    : null;

  return (
    <div className="flex h-screen flex-col bg-background font-sans text-foreground transition-colors duration-200">
      <div className="bg-background transition-colors duration-200">
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
        onToggleSidebar={(open) => setRegionOpen("leftSidebar", open)}
      />

      <div className="relative flex flex-1 flex-row overflow-hidden">
        {!isSidebarOpen && (
          <div className="pointer-events-auto absolute left-4 top-4 z-50">
            <button
              onClick={() => setRegionOpen("leftSidebar", true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground shadow-sm transition-colors duration-150 hover:bg-surface-hover"
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
          {isSidebarOpen && (
            <>
              <Panel
                id="left-sidebar"
                defaultSize={toPanelPercentSize(docsSidebarRatio)}
                minSize={docsSidebarSize.minSize}
                maxSize={docsSidebarSize.maxSize}
                className="flex min-w-0 shrink-0 flex-col overflow-hidden border-r border-border bg-background"
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle
                data-separator-feature="docs.sidebar"
                className="relative z-20 w-1 shrink-0 cursor-col-resize bg-border/40 transition-colors hover:bg-blue-500/50 focus-visible:bg-blue-500/50"
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

          {!isSidebarOpen && !activeRightTab && (
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
