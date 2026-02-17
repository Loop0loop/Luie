import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { type Editor as TiptapEditor } from "@tiptap/react";
import WindowBar from './WindowBar';
import { cn } from '../../../../shared/types/utils';
import { useUIStore } from '../../stores/uiStore';
import { useTranslation } from "react-i18next";
import { SnapshotList } from "../snapshot/SnapshotList";
import { TrashList } from "../trash/TrashList";
import EditorToolbar from '../editor/EditorToolbar';
import { EditorRuler } from "../editor/EditorRuler";
import StatusFooter from "../common/StatusFooter";
import { api } from "../../services/api";
import ResearchPanel from "../research/ResearchPanel";  
import WorldPanel from "../research/WorldPanel";
import { 
  Menu, 
  ChevronLeft, 
  MessageSquareText, 
  Clock, 
  History, // Used for Snapshot
  Trash2, // Used for Trash
  Plus,
  User, // Character
  Globe, // World
  StickyNote, // Scrap
  Sparkles, // Analysis
  Settings
} from "lucide-react";

interface GoogleDocsLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  currentProjectId?: string;
  editor?: TiptapEditor | null;
  onOpenSettings: () => void;
}

export default function GoogleDocsLayout({ 
  children, 
  sidebar, 
  activeChapterId, 
  currentProjectId, 
  editor,
  onOpenSettings
}: GoogleDocsLayoutProps) {
  const { t } = useTranslation();
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);
  const [pageMargins, setPageMargins] = useState({ left: 96, right: 96, firstLineIndent: 0 });

  const {
    isSidebarOpen,
    sidebarWidth,
    contextWidth,
    docsRightTab: activeRightTab,
    isBinderBarOpen,
    setSidebarOpen,
    setSidebarWidth,
    setContextWidth,
    setDocsRightTab: setActiveRightTab,
    setBinderBarOpen,
  } = useUIStore();
  
  const handleRightTabClick = useCallback((tab: "character" | "world" | "scrap" | "analysis" | "snapshot" | "trash") => {
     setActiveRightTab(activeRightTab === tab ? null : tab);
  }, [activeRightTab, setActiveRightTab]);

  const handleOpenExport = async () => {
    if (!activeChapterId) return;
    await api.window.openExport(activeChapterId);
  };
  
  // Resizing logic
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeResizerRef = useRef<"left" | "right" | null>(null);

  const startResize = useCallback((side: "left" | "right", event: React.PointerEvent) => {
    event.preventDefault();
    activeResizerRef.current = side;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!activeResizerRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (activeResizerRef.current === "left") {
        const next = Math.max(200, Math.min(420, event.clientX - rect.left));
        setSidebarWidth(Math.round(next));
        return;
      }

      // Right resizer (Context Panel)
      const next = Math.min(800, Math.max(240, rect.right - event.clientX - 56)); // 56 is Google Apps Bar width, Max 800px
      setContextWidth(Math.round(next));
    };

    const stopResize = () => {
      if (!activeResizerRef.current) return;
      activeResizerRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [setSidebarWidth, setContextWidth]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans transition-colors duration-200">
      {/* 1. Window Bar */}
      <div className="bg-background transition-colors duration-200">
           <WindowBar />
      </div>

      {/* 2. Header */}
      <header className="h-[64px] flex items-center justify-between px-4 shrink-0 select-none bg-background transition-colors duration-200">
          {/* Left Section: Toggle, Home, Title */}
          <div className="flex items-center gap-3 min-w-0">
              {/* Sidebar Toggle */}
              {/* Sidebar Toggle (Only visible when open, otherwise use floating) */}
              {isSidebarOpen && (
                <button 
                    onClick={() => setSidebarOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground shrink-0"
                    title={t("sidebar.toggle.close")}
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Home Icon */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted/50 cursor-pointer transition-colors shrink-0" title={t("common.home")}>
                  <div className="w-6 h-8 bg-blue-500 rounded-[2px] relative flex items-center justify-center shadow-sm scale-90">
                      <div className="w-4 h-0.5 bg-white mb-1 rounded-sm"/>
                      <div className="w-4 h-0.5 bg-white mb-1 rounded-sm"/>
                      <div className="w-2 h-0.5 bg-white rounded-sm mr-auto ml-1"/>
                  </div>
              </div>

              {/* Title Input */}
              <input 
                  type="text"
                  defaultValue={t("project.defaults.untitled")}
                  className="text-[18px] text-foreground bg-transparent px-2 py-0.5 rounded-[4px] hover:bg-muted/50 focus:bg-background focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 border border-transparent truncate max-w-[400px] min-w-[150px]"
              />
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center gap-2 shrink-0">
               <button className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground" title={t("common.history")}>
                   <Clock className="w-5 h-5" />
               </button>
               <button className="w-10 h-10 rounded-full hover:bg-muted/50 flex items-center justify-center transition-colors text-muted-foreground" title={t("common.comment")}>
                   <MessageSquareText className="w-5 h-5" />
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
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
         
         {/* Floating Sidebar Toggle (Visible when closed) */}
         {!isSidebarOpen && (
            <button
                onClick={() => setSidebarOpen(true)}
                className="absolute left-4 top-4 z-50 w-10 h-10 bg-background border border-border/50 shadow-md rounded-full flex items-center justify-center hover:bg-muted/50 transition-all text-muted-foreground"
                title={t("sidebar.toggle.open")}
            >
                <Menu className="w-5 h-5" />
            </button>
         )}
         
         {/* Left Sidebar (Manuscript Only) */}
         <div 
           className={cn(
             "bg-background border-r border-border overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out",
             !isSidebarOpen && "border-r-0 opacity-0 pointer-events-none"
           )}
           style={{ width: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
         >
            {sidebar}
         </div>

         {/* Left Resizer */}
         <div
            className="w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors z-20 absolute top-0 bottom-0"
            style={{ left: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
            onPointerDown={(e) => startResize("left", e)}
        />

         {/* Main Content Column (Editor + Footer) */}
         <div className="flex-1 flex flex-col min-w-0 bg-secondary/30 relative z-0 transition-colors duration-200">
             
             {/* Scrollable Area for Editor */}
             {/* Scrollable Area for Editor */}
             <main className="flex-1 overflow-y-auto flex flex-col items-center relative custom-scrollbar bg-sidebar">
                                  {/* Ruler - Sticky Top (Opaque Background Fixed) */}
                   <div className="sticky top-0 z-30 pt-4 pb-2 shrink-0 select-none bg-sidebar/95 backdrop-blur-sm flex justify-center w-full">
                    <div className="bg-background border border-border shadow-sm">
                        <EditorRuler onMarginsChange={setPageMargins} />
                    </div>
                  </div>
                 
                  {/* Page (A4: 210mm x 297mm @ 96DPI ~= 794px x 1123px) */}
                   <div 
                    className="mb-8 bg-background min-h-[1123px] transition-all duration-200 ease-in-out relative flex flex-col box-border shadow-md border border-border"
                    style={{ 
                        width: '794px', 
                        paddingTop: '96px',
                        paddingBottom: '96px',
                        paddingLeft: `${pageMargins.left}px`,
                        paddingRight: `${pageMargins.right}px`,
                        color: 'var(--foreground)' // Enforce theme text color
                    }}
                   >
                     {children}
                </div>
                
             </main>

             {/* Footer Fixed at Bottom of Main Column */}
             <StatusFooter onOpenExport={handleOpenExport} />
         </div>
          
          {/* Right Resizer */}
          {activeRightTab && ( 
             <div
                 className="w-1 shrink-0 cursor-col-resize hover:bg-[#4285F4] transition-colors z-20 absolute top-0 bottom-0"
                 style={{ right: activeRightTab ? `${contextWidth + 56}px` : "56px" }}
                 onPointerDown={(e) => startResize("right", e)}
             />
          )}
 
          {/* Right Sidebar (Tools Panel) */}
          <div 
            className={cn(
              "bg-background border-l border-border overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out",
              (!activeRightTab) && "border-l-0 opacity-0 pointer-events-none"
            )}
            style={{ width: activeRightTab ? `${contextWidth}px` : "0px" }}
          >
              <div className="h-full flex flex-col">
                  {/* Character Panel */}
                  {activeRightTab === "character" && (
                    <div className="h-full">
                        <ResearchPanel activeTab="character" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {/* World Panel (Multi-tab) */}
                  {activeRightTab === "world" && (
                    <div className="h-full">
                        <WorldPanel onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {/* Scrap Panel */}
                  {activeRightTab === "scrap" && (
                    <div className="h-full">
                        <ResearchPanel activeTab="scrap" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {/* Analysis Panel */}
                  {activeRightTab === "analysis" && (
                    <div className="h-full">
                        <ResearchPanel activeTab="analysis" onClose={() => setActiveRightTab(null)} />
                    </div>
                  )}

                  {/* Snapshot Panel */}
                  {activeRightTab === "snapshot" && (
                    <div className="flex flex-col h-full">
                         <div className="px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted uppercase tracking-wider bg-gray-50 dark:bg-[#252526]">
                            {t("sidebar.section.snapshot")}
                        </div>
                        {activeChapterId ? (
                            <SnapshotList chapterId={activeChapterId} />
                        ) : (
                            <div className="px-4 py-4 text-xs text-muted italic text-center">
                                {t("sidebar.snapshotEmpty")}
                            </div>
                        )}
                    </div>
                  )}
                  
                  {/* Trash Panel */}
                  {activeRightTab === "trash" && (
                     <div className="flex flex-col h-full">
                         <div className="px-4 py-3 border-b border-border/50 text-xs font-semibold text-muted uppercase tracking-wider bg-gray-50 dark:bg-[#252526]">
                            {t("sidebar.section.trash")}
                            <button onClick={() => setTrashRefreshKey(k => k + 1)} className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded">
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
          </div>
          
          {/* Right Icon Bar (Binder Bar) */}
          <div className={cn(
            "bg-background border-l border-border flex flex-col items-center py-4 gap-4 shrink-0 z-10 transition-all duration-300 ease-in-out overflow-hidden",
            isBinderBarOpen ? "w-14 opacity-100" : "w-0 opacity-0 border-l-0"
          )}>
              
              {/* Collapse Toggle */}
              <button
                onClick={() => setBinderBarOpen(false)}
                className="w-full h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors mb-2 border-b border-border/50"
                title={t("sidebar.toggle.close")}
              >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
              </button>
              
              {/* Character */}
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

              {/* World (Multi-tab) */}
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

              {/* Scrap */}
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

              {/* Analysis */}
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
              
              <div className="w-6 border-b border-border my-1" />

              {/* Snapshot */}
               <button 
                onClick={() => handleRightTabClick("snapshot")} 
                className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors", 
                    activeRightTab === "snapshot" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                )} 
                title={t("sidebar.section.snapshot")}
               >
                  <History className="w-5 h-5" />
              </button>

              {/* Trash */}
               <button 
                onClick={() => handleRightTabClick("trash")} 
                className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors", 
                    activeRightTab === "trash" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                )} 
                title={t("sidebar.section.trash")}
               >
                  <Trash2 className="w-5 h-5" />
              </button>
              
              <div className="mt-auto">
                   <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" title="Add-ons">
                      <Plus className="w-5 h-5 text-[#444746] dark:text-[#c4c7c5]" />
                  </button>
              </div>
          </div>

          {/* Binder Bar Expand Button (shown when collapsed) */}
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
