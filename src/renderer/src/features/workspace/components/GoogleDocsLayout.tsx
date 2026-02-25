import { useCallback, useEffect, type ReactNode } from 'react';
import { type Editor as TiptapEditor } from "@tiptap/react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, type PanelSize } from "react-resizable-panels";
import WindowBar from '@renderer/features/workspace/components/WindowBar';
import { cn } from '@shared/types/utils';
import { useUIStore } from '@renderer/features/workspace/stores/uiStore';
import { useTranslation } from "react-i18next";
import { SnapshotList } from "@renderer/features/snapshot/components/SnapshotList";
import { TrashList } from "@renderer/features/trash/components/TrashList";
import ExportPreviewPanel from "@renderer/features/export/components/ExportPreviewPanel";
import { EditorDropZones } from "@shared/ui/EditorDropZones";
import Editor from "@renderer/features/editor/components/Editor";
import EditorToolbar from '@renderer/features/editor/components/EditorToolbar';
import { EditorRuler } from "@renderer/features/editor/components/EditorRuler";
import StatusFooter from "@shared/ui/StatusFooter";
import { useState } from 'react';

import ResearchPanel from "@renderer/features/research/components/ResearchPanel";
import WorldPanel from "@renderer/features/research/components/WorldPanel";
import { DraggableItem } from "@shared/ui/DraggableItem";
import {
  ensureDocsPanelVisible,
  openDocsRightTab,
} from "@renderer/features/workspace/services/docsPanelService";
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

const DOCS_LEFT_MIN_WIDTH_PX = 300;
const DOCS_LEFT_MAX_WIDTH_PX = 520;
const DOCS_LEFT_DEFAULT_WIDTH_PX = 360;
const DOCS_RIGHT_MIN_WIDTH_PX = 380;
const DOCS_RIGHT_MAX_WIDTH_PX = 1400;
const DOCS_RIGHT_DEFAULT_WIDTH_PX = 900;

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
  onOpenExport?: () => void;
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
  onOpenExport,
}: GoogleDocsLayoutProps) {
  const { t } = useTranslation();
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);
  const [pageMargins, setPageMargins] = useState({ left: 96, right: 96, firstLineIndent: 0 });

  const {
    isSidebarOpen,
    docsRightTab: activeRightTab,
    isBinderBarOpen,
    sidebarWidths,
    setSidebarOpen,
    setDocsRightTab: setActiveRightTab,
    setBinderBarOpen,
    setSidebarWidth,
    setFocusedClosableTarget,
  } = useUIStore();

  /* Keep docs side panel opening behavior centralized */
  useEffect(() => {
    if (activeRightTab) {
      ensureDocsPanelVisible();
    }
  }, [activeRightTab]);

  const handleRightTabClick = useCallback((tab: "character" | "world" | "event" | "faction" | "scrap" | "analysis" | "snapshot" | "trash" | "editor" | "export") => {
    const nextTab = activeRightTab === tab ? null : tab;
    if (!nextTab) {
      setActiveRightTab(null);
      return;
    }
    setFocusedClosableTarget({ kind: "docs-tab" });
    openDocsRightTab(nextTab);
  }, [activeRightTab, setActiveRightTab, setFocusedClosableTarget]);

  const handleLeftResize = useCallback((panelSize: PanelSize) => {
    const nextWidth = Math.round(panelSize.inPixels);
    const bounded = Math.min(
      DOCS_LEFT_MAX_WIDTH_PX,
      Math.max(DOCS_LEFT_MIN_WIDTH_PX, nextWidth),
    );
    setSidebarWidth("docsBinder", bounded);
  }, [setSidebarWidth]);

  const handleRightResize = useCallback((panelSize: PanelSize) => {
    if (!activeRightTab) return;
    const nextWidth = Math.round(panelSize.inPixels);
    const bounded = Math.min(
      DOCS_RIGHT_MAX_WIDTH_PX,
      Math.max(DOCS_RIGHT_MIN_WIDTH_PX, nextWidth),
    );
    setSidebarWidth(activeRightTab, bounded);
  }, [activeRightTab, setSidebarWidth]);

  const leftSavedPxWidth = Math.min(
    DOCS_LEFT_MAX_WIDTH_PX,
    Math.max(
      DOCS_LEFT_MIN_WIDTH_PX,
      sidebarWidths["docsBinder"] || DOCS_LEFT_DEFAULT_WIDTH_PX,
    ),
  );

  const rightSavedPxWidth = Math.min(
    DOCS_RIGHT_MAX_WIDTH_PX,
    Math.max(
      DOCS_RIGHT_MIN_WIDTH_PX,
      activeRightTab
        ? sidebarWidths[activeRightTab] || DOCS_RIGHT_DEFAULT_WIDTH_PX
        : DOCS_RIGHT_DEFAULT_WIDTH_PX,
    ),
  );

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
              onClick={() => setSidebarOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground shrink-0"
              title={t("sidebar.toggle.close")}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 cursor-pointer transition-colors shrink-0" title={t("home")}>
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
            className="text-[18px] text-foreground bg-transparent px-2 py-0.5 rounded-[4px] hover:bg-muted/50 focus:bg-background focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 border border-transparent truncate max-w-[400px] min-w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleRightTabClick("snapshot")}
            className={cn("w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground", activeRightTab === "snapshot" && "bg-accent/10 text-accent")}
            title={t("sidebar.section.snapshot")}
          >
            <History className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleRightTabClick("trash")}
            className={cn("w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground", activeRightTab === "trash" && "bg-accent/10 text-accent")}
            title={t("sidebar.section.trash")}
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground"
            title={t("sidebar.section.settings")}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* 3. Toolbar - Standard Full Width */}
      {editor && (
        <div className="shrink-0 z-40 relative w-full flex justify-center bg-background border-b border-border py-1">
          <EditorToolbar editor={editor} />
        </div>
      )}

      {/* 4. Main Body */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative" id="google-docs-layout">

          {/* Floating Sidebar Toggle (Visible when closed) - Placed securely z-50 */}
          {!isSidebarOpen && (
            <div className="absolute left-4 top-4 z-50 pointer-events-auto">
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-10 h-10 bg-background border border-border/50 shadow-md rounded-full flex items-center justify-center hover:bg-muted/50 transition-all text-muted-foreground"
                title={t("sidebar.toggle.open")}
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Left Sidebar (Manuscript Only) */}
          {isSidebarOpen && (
            <>
              <Panel
                id="left-sidebar"
                defaultSize={`${leftSavedPxWidth}px`}
                minSize={`${DOCS_LEFT_MIN_WIDTH_PX}px`}
                maxSize={`${DOCS_LEFT_MAX_WIDTH_PX}px`}
                onResize={handleLeftResize}
                className="bg-background border-r border-border overflow-hidden flex flex-col shrink-0 min-w-0"
              >
                {sidebar}
              </Panel>

              <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-blue-500/50 focus-visible:bg-blue-500/50 transition-colors cursor-col-resize z-20 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>
            </>
          )}

          {/* Main Content Column (Editor + Footer) */}
          <Panel id="center-content" minSize="80px" className="flex-1 flex flex-col min-w-0 bg-secondary/30 relative z-0 transition-colors duration-200">
            <div className="flex-1 relative flex flex-col overflow-hidden">
              <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative" id="google-docs-split-editor">
                <Panel id="editor-main-panel" minSize="80px" className="min-w-0 bg-transparent relative flex flex-col">
                  <EditorDropZones />
                  <main className="flex-1 overflow-y-auto flex flex-col items-center relative custom-scrollbar bg-sidebar">
                    <div className="sticky top-0 z-30 pt-4 pb-2 shrink-0 select-none bg-sidebar/95 backdrop-blur-sm flex justify-center w-full">
                      <div className="bg-background border border-border shadow-sm">
                        <EditorRuler onMarginsChange={setPageMargins} />
                      </div>
                    </div>

                    <div
                      className="mb-8 bg-background min-h-[1123px] transition-all duration-200 ease-in-out relative flex flex-col box-border shadow-md border border-border"
                      style={{
                        width: '794px',
                        paddingTop: '96px',
                        paddingBottom: '96px',
                        paddingLeft: `${pageMargins.left}px`,
                        paddingRight: `${pageMargins.right}px`,
                        color: 'var(--foreground)'
                      }}
                    >
                      {children}
                    </div>
                  </main>
                  <StatusFooter onOpenExport={onOpenExport} />
                </Panel>
                {additionalPanels}
              </PanelGroup>
            </div>
          </Panel>

          {/* Right Context Panel */}
          {activeRightTab && (
            <>
              <PanelResizeHandle className="w-1 shrink-0 bg-border/40 hover:bg-[#4285F4] focus-visible:bg-[#4285F4] transition-colors cursor-col-resize z-20 relative">
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </PanelResizeHandle>

              <Panel
                key={`right-context-panel-${activeRightTab}`}
                id="right-context-panel"
                defaultSize={`${rightSavedPxWidth}px`}
                minSize={`${DOCS_RIGHT_MIN_WIDTH_PX}px`}
                maxSize={`${DOCS_RIGHT_MAX_WIDTH_PX}px`}
                onResize={handleRightResize}
                onMouseDownCapture={() => {
                  setFocusedClosableTarget({ kind: "docs-tab" });
                }}
                className="bg-background border-l border-border overflow-hidden flex flex-col shrink-0 min-w-0"
              >
                <div className="h-full flex flex-col">
                  {activeRightTab === "character" && (
                    <div className="h-full">
                      <ResearchPanel activeTab="character" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {activeRightTab === "world" && (
                    <div className="h-full">
                      <WorldPanel onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {activeRightTab === "event" && (
                    <div className="h-full">
                      <ResearchPanel activeTab="event" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {activeRightTab === "faction" && (
                    <div className="h-full">
                      <ResearchPanel activeTab="faction" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {activeRightTab === "scrap" && (
                    <div className="h-full">
                      <ResearchPanel activeTab="scrap" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {activeRightTab === "analysis" && (
                    <div className="h-full">
                      <ResearchPanel activeTab="analysis" onClose={() => setActiveRightTab(null)} />
                    </div>
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
                    <div className="h-full">
                      <ExportPreviewPanel title={activeChapterTitle} />
                    </div>
                  )}

                  {activeRightTab === "snapshot" && (
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted uppercase tracking-wider bg-sidebar">
                        {t("sidebar.section.snapshot")}
                      </div>
                      {activeChapterId ? (
                        <SnapshotList chapterId={activeChapterId} />
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
                        <button onClick={() => setTrashRefreshKey(k => k + 1)} className="ml-auto p-1 hover:bg-muted/50 rounded">
                          <History className="w-3 h-3 text-muted" />
                        </button>
                      </div>
                      {currentProjectId ? (
                        <TrashList projectId={currentProjectId} refreshKey={trashRefreshKey} />
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

        </PanelGroup>

        {/* Right Icon Bar (Binder Bar) - OUTSIDE the PanelGroup so it's a fixed width on far right */}
        <div className={cn(
          "bg-background border-l border-border flex flex-col items-center py-4 gap-4 shrink-0 z-10 transition-all duration-300 ease-in-out overflow-hidden h-full",
          isBinderBarOpen ? "w-14 opacity-100" : "w-0 opacity-0 border-l-0"
        )}>
          <button
            onClick={() => setBinderBarOpen(false)}
            className="w-full h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors mb-2 border-b border-border/50"
            title={t("sidebar.toggle.close")}
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
          </button>

          <DraggableItem id="binder-icon-character" data={{ type: "character", id: "binder-character", title: t("research.title.characters") }}>
            <button
              onClick={() => handleRightTabClick("character")}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                activeRightTab === "character" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
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
                "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                activeRightTab === "world" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
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
                "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                activeRightTab === "event" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
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
                "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                activeRightTab === "faction" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
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
                "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                activeRightTab === "scrap" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
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
                "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                activeRightTab === "analysis" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
              )}
              title={t("research.title.analysis")}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </DraggableItem>
          <div className="mt-auto">
            <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" title={t("menu.extensions")}>
              <Plus className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {!isBinderBarOpen && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center">
            <button
              onClick={() => setBinderBarOpen(true)}
              className="w-8 h-12 bg-background border border-r-0 border-border shadow-md rounded-l-lg flex items-center justify-center hover:bg-muted/50 transition-colors text-muted-foreground cursor-pointer"
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
