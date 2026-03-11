import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { type Editor as TiptapEditor } from "@tiptap/react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import WindowBar from '@renderer/features/workspace/components/WindowBar';
import { cn } from '@shared/types/utils';
import { useUIStore } from '@renderer/features/workspace/stores/uiStore';
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import Editor from "@renderer/features/editor/components/Editor";
import EditorToolbar from '@renderer/features/editor/components/EditorToolbar';
import { EditorRuler } from "@renderer/features/editor/components/EditorRuler";
import StatusFooter from "@shared/ui/StatusFooter";

import { DraggableItem } from "@shared/ui/DraggableItem";
import {
  openDocsRightTab,
} from "@renderer/features/workspace/services/docsPanelService";
import {
  getDocsLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  toPanelPercentSize,
  toPanelPixelSize,
  type DocsLayoutPanelTab,
} from "@shared/constants/layoutSizing";
import type { LayoutPersistEntry } from "@renderer/features/workspace/hooks/useLayoutPersist";
import {
  EDITOR_A4_PAGE_HEIGHT_PX,
  EDITOR_A4_PAGE_WIDTH_PX,
  EDITOR_PAGE_VERTICAL_PADDING_PX,
  EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
  EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
} from "@shared/constants/configs";
import { useLayoutPersist } from "@renderer/features/workspace/hooks/useLayoutPersist";
import { toPercentSize } from "@shared/constants/sidebarSizing";
import {
  Menu,
  ChevronLeft,
  History,
  Trash2,
  Plus,
  User,
  Globe,
  StickyNote,
  Sparkles,
  Settings,
  Calendar,
  Shield
} from "lucide-react";

const ResearchPanel = lazy(() => import("@renderer/features/research/components/ResearchPanel"));
const WorldPanel = lazy(() => import("@renderer/features/research/components/WorldPanel"));
const SnapshotList = lazy(() =>
  import("@renderer/features/snapshot/components/SnapshotList").then((module) => ({
    default: module.SnapshotList,
  })),
);
const TrashList = lazy(() =>
  import("@renderer/features/trash/components/TrashList").then((module) => ({
    default: module.TrashList,
  })),
);
const ExportPreviewPanel = lazy(() => import("@renderer/features/export/components/ExportPreviewPanel"));

interface GoogleDocsLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  activeChapterContent?: string;
  currentProjectId?: string;
  editor?: TiptapEditor | null;
  onOpenSettings: () => void;
  onRenameChapter?: (id: string, title: string) => void;
  onSaveChapter?: (title: string, content: string) => void | Promise<void>;
  additionalPanels?: ReactNode;
  additionalPanelIds?: string[];
  onOpenExport?: () => void;
  onOpenWorldGraph?: () => void;
}

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
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);
  const [pageMargins, setPageMargins] = useState({
    left: EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
    right: EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
    firstLineIndent: 0,
  });

  const {
    isSidebarOpen,
    activeRightTab,
    isPanelRailOpen,
    layoutSurfaceRatios,
    setRegionOpen,
    closeRightPanel,
    setPanelRailOpen,
    setFocusedClosableTarget,
  } = useUIStore(
    useShallow((state) => ({
      isSidebarOpen: state.regions.leftSidebar.open,
      activeRightTab: state.regions.rightPanel.open
        ? state.docsRightTab ?? state.regions.rightPanel.activeTab
        : null,
      isPanelRailOpen: state.regions.rightRail.open,
      layoutSurfaceRatios: state.layoutSurfaceRatios,
      setRegionOpen: state.setRegionOpen,
      closeRightPanel: state.closeRightPanel,
      setPanelRailOpen: state.setBinderBarOpen,
      setFocusedClosableTarget: state.setFocusedClosableTarget,
    }))
  );

  const handleRightTabClick = useCallback((tab: DocsLayoutPanelTab) => {
    if (activeRightTab === tab) {
      closeRightPanel();
      return;
    }
    setFocusedClosableTarget({ kind: "docs-tab" });
    openDocsRightTab(tab);
  }, [activeRightTab, closeRightPanel, setFocusedClosableTarget]);

  const docsSidebarConfig = getLayoutSurfaceConfig("docs.sidebar");

  const layoutEntries = useMemo<LayoutPersistEntry[]>(() => {
    const entries: LayoutPersistEntry[] = [
      { id: "left-sidebar", surface: "docs.sidebar" },
    ];
    if (activeRightTab) {
      entries.push({
        id: `right-context-panel-${activeRightTab}`,
        surface: getDocsLayoutPanelSurface(activeRightTab),
      });
    }
    return entries;
  }, [activeRightTab]);

  const onLayoutChanged = useLayoutPersist(layoutEntries);

  const docsSidebarRatio =
    layoutSurfaceRatios["docs.sidebar"] ?? getLayoutSurfaceDefaultRatio("docs.sidebar");

  const activePanelSurface = activeRightTab
    ? getDocsLayoutPanelSurface(activeRightTab)
    : null;
  const rightPanelRatio = activePanelSurface
    ? layoutSurfaceRatios[activePanelSurface] ?? getLayoutSurfaceDefaultRatio(activePanelSurface)
    : null;
  const rightPanelConfig = activePanelSurface
    ? getLayoutSurfaceConfig(activePanelSurface)
    : null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans transition-colors duration-200">
      {/* 1. Window Bar */}
      <div className="bg-background transition-colors duration-200">
        <WindowBar />
      </div>

      {/* 2. Header */}
      <header className="h-[64px] flex items-center justify-between px-4 shrink-0 select-none bg-background transition-colors duration-200">
        <div className="flex items-center gap-3 min-w-0">
          {isSidebarOpen && (
            <button
              onClick={() => setRegionOpen("leftSidebar", false)}
              className="w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center transition-colors text-muted-foreground shrink-0"
              title={t("sidebar.toggle.close")}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-hover cursor-pointer transition-colors shrink-0" title={t("home")}>
            <div className="w-6 h-8 bg-blue-500 rounded-[2px] relative flex items-center justify-center shadow-sm scale-90">
              <div className="w-4 h-0.5 bg-white mb-1 rounded-sm" />
              <div className="w-4 h-0.5 bg-white mb-1 rounded-sm" />
              <div className="w-2 h-0.5 bg-white rounded-sm mr-auto ml-1" />
            </div>
          </div>

          <input
            type="text"
            value={activeChapterTitle || ""}
            onChange={(e) => {
              const val = e.target.value;
              if (activeChapterId && onRenameChapter) {
                onRenameChapter(activeChapterId, val);
              }
            }}
            placeholder={t("project.defaults.untitled")}
            className="text-[18px] text-foreground bg-transparent px-2 py-0.5 rounded-[4px] hover:bg-surface-hover focus:bg-background focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors duration-150 border border-transparent truncate max-w-[400px] min-w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleRightTabClick("snapshot")}
            className={cn("w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center transition-colors text-muted-foreground", activeRightTab === "snapshot" && "bg-accent/10 text-accent")}
            title={t("sidebar.section.snapshot")}
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleRightTabClick("trash")}
            className={cn("w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center transition-colors text-muted-foreground", activeRightTab === "trash" && "bg-accent/10 text-accent")}
            title={t("sidebar.section.trash")}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center transition-colors text-muted-foreground"
            title={t("sidebar.section.settings")}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* 3. Toolbar - Standard Full Width */}
      {editor && (
        <div className="shrink-0 z-40 relative w-full flex justify-center bg-background border-b border-border py-1">
          <EditorToolbar editor={editor} onOpenWorldGraph={onOpenWorldGraph} />
        </div>
      )}

      {/* 4. Main Body */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* Floating Sidebar Toggle (Visible when closed) */}
        {!isSidebarOpen && (
          <div className="absolute left-4 top-4 z-50 pointer-events-auto">
            <button
              onClick={() => setRegionOpen("leftSidebar", true)}
              className="w-10 h-10 bg-background border border-border/50 shadow-sm rounded-full flex items-center justify-center hover:bg-surface-hover transition-colors duration-150 text-muted-foreground"
              title={t("sidebar.toggle.open")}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}

        <PanelGroup
          orientation="horizontal"
          className="flex w-full h-full flex-1 overflow-hidden relative"
          id="docs-layout-group"
          onLayoutChanged={onLayoutChanged}
        >

          {/* Left Sidebar (Manuscript Only) */}
          {isSidebarOpen && (
            <>
              <Panel
                id="left-sidebar"
                defaultSize={toPanelPercentSize(docsSidebarRatio)}
                minSize={toPanelPixelSize(docsSidebarConfig.minPx)}
                maxSize={toPanelPixelSize(docsSidebarConfig.maxPx)}
                className="bg-background border-r border-border overflow-hidden flex flex-col shrink-0 min-w-0"
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle data-separator-feature="docs.sidebar" className="w-1 shrink-0 bg-border/40 hover:bg-blue-500/50 focus-visible:bg-blue-500/50 transition-colors cursor-col-resize z-20 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          {/* Main Content Column (Editor + Footer) */}
          <Panel
            id="center-content"
            minSize={toPercentSize(10)}
            className="flex-1 flex flex-col min-w-0 bg-secondary/30 relative z-0 transition-colors duration-200"
          >
            <div className="flex-1 relative flex flex-col overflow-hidden">
              <PanelGroup
                orientation="horizontal"
                className="flex w-full h-full flex-1 overflow-hidden relative"
                id="docs-editor-split-group"
              >
                <Panel
                  id="editor-main-panel"
                  minSize={toPercentSize(10)}
                  className="min-w-0 bg-transparent relative flex flex-col"
                >
                  <EditorDropZones />
                  <main className="flex-1 overflow-y-auto flex flex-col items-center relative custom-scrollbar bg-sidebar">
                    <div className="sticky top-0 z-30 pt-4 pb-2 shrink-0 select-none bg-sidebar/95 backdrop-blur-sm flex justify-center w-full">
                      <div className="bg-background border border-border shadow-sm">
                        <EditorRuler onMarginsChange={setPageMargins} />
                      </div>
                    </div>

                    <div
                      className="mb-8 bg-background transition-shadow duration-150 ease-in-out relative flex flex-col box-border shadow-sm border border-border"
                      style={{
                        width: `${EDITOR_A4_PAGE_WIDTH_PX}px`,
                        minHeight: `${EDITOR_A4_PAGE_HEIGHT_PX}px`,
                        paddingTop: `${EDITOR_PAGE_VERTICAL_PADDING_PX}px`,
                        paddingBottom: `${EDITOR_PAGE_VERTICAL_PADDING_PX}px`,
                        paddingLeft: `${pageMargins.left}px`,
                        paddingRight: `${pageMargins.right}px`,
                        color: "var(--editor-text, var(--text-primary))"
                      }}
                    >
                      {children}
                    </div>
                  </main>
                  <StatusFooter onOpenExport={onOpenExport} />
                </Panel>
                {additionalPanels}
                {additionalPanelIds.length === 0 && (
                  <Panel
                    id="docs-editor-placeholder"
                    defaultSize={0}
                    minSize={0}
                    maxSize={0}
                    className="pointer-events-none overflow-hidden opacity-0"
                  />
                )}
              </PanelGroup>
            </div>
          </Panel>

          {/* Right Context Panel */}
          {activeRightTab && (
            <>
                  <PanelResizeHandle data-separator-feature={activePanelSurface} className="w-1 shrink-0 bg-border/40 hover:bg-accent/60 focus-visible:bg-accent/60 transition-colors cursor-col-resize z-20 relative">
                    <div className="absolute inset-y-0 -left-1 -right-1" />
                  </PanelResizeHandle>

                  <Panel
                    key={`right-context-panel-${activeRightTab}`}
                    id={`right-context-panel-${activeRightTab}`}
                    defaultSize={toPanelPercentSize(rightPanelRatio ?? 0)}
                    minSize={toPanelPixelSize(rightPanelConfig?.minPx ?? 320)}
                    maxSize={toPanelPixelSize(rightPanelConfig?.maxPx ?? 760)}
                    onMouseDownCapture={() => {
                      setFocusedClosableTarget({ kind: "docs-tab" });
                    }}
                className="bg-background border-l border-border overflow-hidden flex flex-col shrink-0 min-w-0"
              >
                <div className="h-full flex flex-col">
                  {activeRightTab === "character" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <ResearchPanel activeTab="character" onClose={closeRightPanel} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "world" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <WorldPanel onClose={closeRightPanel} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "event" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <ResearchPanel activeTab="event" onClose={closeRightPanel} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "faction" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <ResearchPanel activeTab="faction" onClose={closeRightPanel} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "scrap" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <ResearchPanel activeTab="scrap" onClose={closeRightPanel} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "analysis" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <ResearchPanel activeTab="analysis" onClose={closeRightPanel} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "editor" && (
                    <div className="h-full">
                      <Editor
                        key={`docs-side-editor-${activeChapterId ?? "none"}`}
                        chapterId={activeChapterId ?? undefined}
                        initialTitle={activeChapterTitle ?? ""}
                        initialContent={activeChapterContent ?? ""}
                        onSave={onSaveChapter}
                        hideFooter={true}
                        hideToolbar={true}
                        hideTitle={true}
                        scrollable={true}
                      />
                    </div>
                  )}

                  {activeRightTab === "export" && (
                    <Suspense fallback={<div className="p-4 text-sm text-muted">{t("loading")}</div>}>
                      <div className="h-full">
                        <ExportPreviewPanel title={activeChapterTitle} />
                      </div>
                    </Suspense>
                  )}

                  {activeRightTab === "snapshot" && (
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted uppercase tracking-wider bg-sidebar">
                        {t("sidebar.section.snapshot")}
                      </div>
                      {activeChapterId ? (
                        <Suspense fallback={<div className="px-4 py-4 text-xs text-muted italic text-center">{t("loading")}</div>}>
                          <SnapshotList chapterId={activeChapterId} />
                        </Suspense>
                      ) : (
                        <div className="px-4 py-4 text-xs text-muted italic text-center">
                          {t("snapshot.list.selectChapter")}
                        </div>
                      )}
                    </div>
                  )}

                  {activeRightTab === "trash" && (
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted uppercase tracking-wider bg-sidebar">
                        {t("sidebar.section.trash")}
                        <button onClick={() => setTrashRefreshKey(k => k + 1)} className="ml-auto p-1 hover:bg-surface-hover rounded">
                          <History className="w-3 h-3 text-muted" />
                        </button>
                      </div>
                      {currentProjectId ? (
                        <Suspense fallback={<div className="px-4 py-4 text-xs text-muted italic text-center">{t("loading")}</div>}>
                          <TrashList projectId={currentProjectId} refreshKey={trashRefreshKey} />
                        </Suspense>
                      ) : (
                        <div className="px-4 py-4 text-xs text-muted italic text-center">
                          {t("sidebar.trashEmpty")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Panel>
            </>
          )}

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

        {/* Right Panel Rail - fixed width and intentionally separate from panel sizing */}
        <div className={cn(
          "bg-background border-l border-border flex flex-col items-center py-4 gap-4 shrink-0 z-10 transition-all duration-300 ease-in-out overflow-hidden h-full",
          isPanelRailOpen ? "w-14 opacity-100" : "w-0 opacity-0 border-l-0"
        )}>
          <button
            onClick={() => setPanelRailOpen(false)}
            className="w-full h-8 flex items-center justify-center hover:bg-surface-hover transition-colors mb-2 border-b border-border/50"
            title={t("sidebar.toggle.close")}
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
          </button>

          <DraggableItem id="binder-icon-character" data={{ type: "character", id: "binder-character", title: t("research.title.characters") }}>
            <button
              onClick={() => handleRightTabClick("character")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors",
                activeRightTab === "character" && "bg-accent/15 text-accent"
              )}
              title={t("research.title.characters")}
            >
              <User className="w-5 h-5" />
            </button>
          </DraggableItem>

          <DraggableItem id="binder-icon-world" data={{ type: "world", id: "binder-world", title: t("research.title.world") }}>
            <button
              onClick={() => handleRightTabClick("world")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors",
                activeRightTab === "world" && "bg-accent/15 text-accent"
              )}
              title={t("research.title.world")}
            >
              <Globe className="w-5 h-5" />
            </button>
          </DraggableItem>

          <DraggableItem id="binder-icon-event" data={{ type: "event", id: "binder-event", title: t("research.title.events", "Events") }}>
            <button
              onClick={() => handleRightTabClick("event")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors",
                activeRightTab === "event" && "bg-accent/15 text-accent"
              )}
              title={t("research.title.events", "Events")}
            >
              <Calendar className="w-5 h-5" />
            </button>
          </DraggableItem>

          <DraggableItem id="binder-icon-faction" data={{ type: "faction", id: "binder-faction", title: t("research.title.factions", "Factions") }}>
            <button
              onClick={() => handleRightTabClick("faction")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors",
                activeRightTab === "faction" && "bg-accent/15 text-accent"
              )}
              title={t("research.title.factions", "Factions")}
            >
              <Shield className="w-5 h-5" />
            </button>
          </DraggableItem>

          <DraggableItem id="binder-icon-memo" data={{ type: "memo", id: "binder-memo", title: t("research.title.scrap") }}>
            <button
              onClick={() => handleRightTabClick("scrap")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors",
                activeRightTab === "scrap" && "bg-accent/15 text-accent"
              )}
              title={t("research.title.scrap")}
            >
              <StickyNote className="w-5 h-5" />
            </button>
          </DraggableItem>

          <DraggableItem id="binder-icon-analysis" data={{ type: "analysis", id: "binder-analysis", title: t("research.title.analysis") }}>
            <button
              onClick={() => handleRightTabClick("analysis")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors",
                activeRightTab === "analysis" && "bg-accent/15 text-accent"
              )}
              title={t("research.title.analysis")}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </DraggableItem>
          <div className="mt-auto">
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover hover:text-fg transition-colors" title={t("menu.extensions")}>
              <Plus className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {!isPanelRailOpen && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
            <button
              onClick={() => setPanelRailOpen(true)}
              className="w-8 h-12 bg-background border border-r-0 border-border shadow-md rounded-l-lg flex items-center justify-center hover:bg-surface-hover transition-colors text-muted-foreground cursor-pointer"
              title={t("sidebar.toggle.open")}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
