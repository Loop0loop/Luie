import { useEffect, useRef, useState } from "react";
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
  type PanelSize,
} from "react-resizable-panels";
import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { shouldCloseDocsPanelOnResize } from "../../utils/googleDocsPanelResize";

const isMacOS = navigator.userAgent.toLowerCase().includes("mac");

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
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
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
    isOpening: isSidebarOpening,
    shouldRender: shouldRenderSidebar,
  } = useResizablePanelPresence({
    enableAnimations,
    isOpen: isSidebarOpen,
    openSize: toPanelPercentSize(docsSidebarRatio),
    panelRef: docsSidebarPanelRef,
  });
  const handleSidebarResize = (panelSize: PanelSize) => {
    if (
      shouldCloseDocsPanelOnResize(
        panelSize,
        isSidebarOpening,
        isSidebarClosing,
      )
    ) {
      suppressLayoutPersistenceFor(500);
      setDocsSidebarOpen(false);
    }
  };
  useEffect(() => {
    if (!isSidebarResizing) return;

    const stopSidebarResize = () => setIsSidebarResizing(false);
    window.addEventListener("pointerup", stopSidebarResize);
    window.addEventListener("pointercancel", stopSidebarResize);
    return () => {
      window.removeEventListener("pointerup", stopSidebarResize);
      window.removeEventListener("pointercancel", stopSidebarResize);
    };
  }, [isSidebarResizing]);

  return (
    <div className="relative flex h-screen bg-app font-sans text-fg transition-colors duration-200">
      <PanelGroup
        orientation="horizontal"
        className="relative flex h-full w-full overflow-hidden"
        id="docs-layout-group"
        elementRef={docsLayoutGroupRef}
        onLayoutChanged={onSidebarLayoutChanged}
      >
          {shouldRenderSidebar && (
            <>
              <Panel
                id="left-sidebar"
                panelRef={docsSidebarPanelRef}
                collapsible
                collapsedSize={0}
                data-panel-animated={isSidebarResizing ? undefined : "true"}
                defaultSize={toPanelPercentSize(docsSidebarRatio)}
                minSize={docsSidebarSize.minSize}
                maxSize={docsSidebarSize.maxSize}
                onResize={handleSidebarResize}
                className={`flex min-w-0 shrink-0 flex-col bg-app ${
                  enableAnimations
                    ? isSidebarClosing
                      ? "animate-out slide-out-to-left fade-out duration-200"
                      : "animate-in slide-in-from-left fade-in duration-200"
                    : ""
                }`}
              >
                <div className="flex h-full flex-col overflow-hidden rounded-[24px] bg-sidebar">
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
                onPointerDown={() => setIsSidebarResizing(true)}
                className="relative z-20 w-1 shrink-0 cursor-col-resize bg-transparent"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          <Panel id="docs-main-shell" minSize={toPanelPercentSize(10)} className="flex min-w-0 flex-1 flex-col bg-app">
            <GoogleDocsHeader
              activeChapterId={activeChapterId}
              activeChapterTitle={activeChapterTitle}
              activeRightTab={activeRightTab}
              onOpenSettings={onOpenSettings}
              onRenameChapter={onRenameChapter}
              onRightTabClick={handleRightTabClick}
              offsetChapterTitle={isMacOS && !isSidebarOpen}
            />

            <div className="relative flex min-h-0 flex-1 flex-row overflow-hidden">
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
                id="docs-content-group"
                onLayoutChanged={onRightLayoutChanged}
              >
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

                {!activeRightTab && (
                  <Panel
                    id="docs-right-placeholder"
                    defaultSize={0}
                    minSize={0}
                    maxSize={0}
                    className="pointer-events-none overflow-hidden opacity-0"
                  />
                )}
              </PanelGroup>

              <GoogleDocsPanelRail
                activeRightTab={activeRightTab}
                onSelectTab={handleRightTabClick}
              />
            </div>
          </Panel>

          {!shouldRenderSidebar && (
            <Panel
              id="docs-sidebar-placeholder"
              defaultSize={0}
              minSize={0}
              maxSize={0}
              className="pointer-events-none overflow-hidden opacity-0"
            />
          )}
      </PanelGroup>
    </div>
  );
}
