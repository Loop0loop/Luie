import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { type Editor as TiptapEditor } from "@tiptap/react";
import WindowBar from './WindowBar';
import { cn } from '../../../../shared/types/utils';
import { useUIStore } from '../../stores/uiStore';
import { useTranslation } from "react-i18next";
import { SnapshotList } from "../snapshot/SnapshotList";
import { TrashList } from "../trash/TrashList";
import EditorToolbar from '../editor/EditorToolbar';
import ContextPanel from "../context/ContextPanel"; // Added
import ResearchPanel from "../research/ResearchPanel"; // Added
import { 
  Menu, 
  ChevronLeft, 
  MessageSquareText, 
  Share, 
  Clock, 
  CloudCheck,
  Star,
  BookOpen, // Used for Research
  History, // Used for Snapshot
  Trash2, // Used for Trash
  Plus,
  FileText, // Used for Synopsis
  User, // Used for Character
  Globe, // Used for World/Proper Nouns
  Sparkles // Used for Research/Analysis
} from "lucide-react";

interface GoogleDocsLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  currentProjectId?: string;
  editor?: TiptapEditor | null;
}

export default function GoogleDocsLayout({ 
  children, 
  sidebar, 
  activeChapterId,
  currentProjectId,
  editor
}: GoogleDocsLayoutProps) {
  const { t } = useTranslation();
  const [activeRightTab, setActiveRightTab] = useState<"research" | "snapshot" | "trash" | null>(null);
  const [researchSubTab, setResearchSubTab] = useState<"synopsis" | "character" | "world" | "scrap" | "analysis">("synopsis");
  const [trashRefreshKey, setTrashRefreshKey] = useState(0);

  const {
    isSidebarOpen,
    isContextOpen,
    sidebarWidth,
    contextWidth,
    setSidebarOpen,
    setContextOpen,
    setSidebarWidth,
    setContextWidth,
  } = useUIStore();
  
  const handleRightTabClick = (tab: "research" | "snapshot" | "trash") => {
    if (activeRightTab === tab && isContextOpen) {
        setContextOpen(false);
        setActiveRightTab(null);
    } else {
        setActiveRightTab(tab);
        setContextOpen(true);
    }
  };

  // Sync ContextPanel tabs (Reverse sync not strictly needed if we control it from here, but good safeguard)
  const handleContextTabChange = (tab: "synopsis" | "characters" | "terms") => {
      const map: Record<string, typeof researchSubTab> = {
          "synopsis": "synopsis",
          "characters": "character",
          "terms": "world"
      };
      if (map[tab]) setResearchSubTab(map[tab]);
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
      const next = Math.min(520, Math.max(240, rect.right - event.clientX - 56)); // 56 is Google Apps Bar width
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
    <div className="flex flex-col h-screen bg-[#f9fbfd] dark:bg-[#1b1b1b] text-fg font-sans transition-colors duration-200">
      {/* 1. Window Bar */}
      <div className="bg-[#f9fbfd] dark:bg-[#1b1b1b] transition-colors duration-200">
           <WindowBar />
      </div>

      {/* 2. Header */}
      <header className="flex items-center px-4 py-1 gap-4 bg-[#f9fbfd] dark:bg-[#1b1b1b] shrink-0 select-none transition-colors duration-200">
          <div className="flex items-center justify-center w-10 h-10 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" title={t("common.home")}>
              <div className="w-6 h-8 bg-[#4285F4] rounded-[2px] relative flex items-center justify-center shadow-sm">
                  <div className="w-4 h-0.5 bg-white mb-1 rounded-sm"/>
                  <div className="w-4 h-0.5 bg-white mb-1 rounded-sm"/>
                  <div className="w-2 h-0.5 bg-white rounded-sm mr-auto ml-1"/>
              </div>
          </div>

          <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                 <span className="text-[18px] text-[#1f1f1f] dark:text-[#e3e3e3] px-1 hover:border hover:border-black dark:hover:border-white rounded cursor-text truncate max-w-[300px]">
                     {t("project.defaults.untitled")}
                 </span>
                 <Star className="w-4 h-4 text-muted hover:text-fg cursor-pointer" />
                 <div title={t("editor.status.saved")}>
                    <CloudCheck className="w-4 h-4 text-muted" />
                 </div>
              </div>
              
              <div className="flex items-center gap-1 text-[14px] text-[#444746] dark:text-[#c4c7c5]">
                   {['file', 'edit', 'view', 'insert', 'format', 'tools', 'extensions', 'help'].map(menu => (
                       <span key={menu} className="px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
                           {t(`common.menu.${menu}`, { defaultValue: menu.charAt(0).toUpperCase() + menu.slice(1) })}
                       </span>
                   ))}
              </div>
          </div>

          <div className="ml-auto flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#444746] dark:text-[#c4c7c5]" title="History">
                  <Clock className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-[#444746] dark:text-[#c4c7c5]" title="Comment">
                  <MessageSquareText className="w-5 h-5" />
              </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-[#c2e7ff] text-[#001d35] rounded-[24px] hover:shadow transition-shadow font-medium text-[14px]">
                  <Share className="w-4 h-4" />
                  <span>{t("common.share")}</span>
              </button>
               <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium">U</div>
          </div>
      </header>
      
      {/* 3. Toolbar */}
      {editor && (
          <div className="shrink-0 z-40 relative">
              <EditorToolbar editor={editor} />
          </div>
      )}

      {/* 4. Main Body */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
         
         {/* Left Sidebar (Manuscript Only) */}
         <div 
           className={cn(
             "bg-white dark:bg-[#1e1e1e] border-r border-[#c7c7c7] dark:border-[#444] overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out",
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

         {/* Main Content Area (Editor) */}
         <main className="flex-1 flex flex-col bg-[#f9fbfd] dark:bg-[#1b1b1b] relative min-w-0 z-0 overflow-y-auto items-center transition-colors duration-200">
             
             {/* Ruler */}
              <div className="shrink-0 w-[794px] h-6 bg-white dark:bg-[#1e1e1e] border-b border-black/10 dark:border-white/10 mt-4 flex px-[96px] relative select-none">
                 <div className="absolute top-0 left-[96px] right-[96px] h-full flex">
                    {Array.from({length: 40}).map((_, i) => (
                        <div key={i} className="flex-1 border-l border-black/10 dark:border-white/10 h-2 mt-auto" />
                    ))}
                 </div>
                 <div className="w-full h-full flex justify-between items-start pt-1 text-[9px] text-muted z-10 px-1">
                    {['1', '2', '3', '4', '5', '6', '7'].map((n) => (
                        <span key={n}>{n}</span>
                    ))}
                 </div>
              </div>
             
             {/* Page (A4: 210mm x 297mm @ 96DPI ~= 794px x 1123px) */}
              <div 
                className="my-4 bg-white dark:bg-[#1e1e1e] shadow-lg border border-black/5 dark:border-white/5 min-h-[1123px] transition-all duration-200 ease-in-out relative flex flex-col"
                style={{ 
                    width: '794px', 
                    maxWidth: 'calc(100% - 40px)', // Responsive fallback
                    padding: '96px' // Standard 1 inch margins
                }}
              >
                 {children}
            </div>

            {/* Toggle Sidebar Button */}
            <div className="absolute top-4 left-4 z-10 print:hidden">
                <button 
                    onClick={() => setSidebarOpen(!isSidebarOpen)}
                    className="p-1.5 rounded-full bg-[#edf2fa] dark:bg-[#333] hover:bg-[#dbe4f7] dark:hover:bg-[#444] text-[#444746] dark:text-[#e3e3e3] transition-colors shadow-sm"
                    title={isSidebarOpen ? t("common.close") : t("common.open")}
                >
                    {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
            </div>
         </main>
          
          {/* Right Resizer */}
          {isContextOpen && ( 
             <div
                 className="w-1 shrink-0 cursor-col-resize hover:bg-[#4285F4] transition-colors z-20 absolute top-0 bottom-0"
                 style={{ right: isContextOpen ? `${contextWidth + 56}px` : "56px" }}
                 onPointerDown={(e) => startResize("right", e)}
             />
          )}
 
          {/* Right Sidebar (Tools Panel) */}
          <div 
            className={cn(
              "bg-white dark:bg-[#1e1e1e] border-l border-[#c7c7c7] dark:border-[#444] overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out",
              (!isContextOpen) && "border-l-0 opacity-0 pointer-events-none"
            )}
            style={{ width: isContextOpen ? `${contextWidth}px` : "0px" }}
          >
              <div className="h-full flex flex-col">
                  {activeRightTab === "research" && (
                      <div className="flex flex-col h-full">
                          {/* Research Tabs Header */}
                          <div className="flex items-center border-b border-border bg-gray-50 dark:bg-[#252526] overflow-x-auto no-scrollbar shrink-0 h-10 px-1">
                              {[
                                  { id: 'synopsis', label: t("sidebar.item.synopsis"), icon: FileText },
                                  { id: 'character', label: t("sidebar.item.characters"), icon: User },
                                  { id: 'world', label: t("sidebar.item.world"), icon: Globe },
                                  { id: 'scrap', label: t("sidebar.item.scrap"), icon: BookOpen },
                                  { id: 'analysis', label: t("research.title.analysis"), icon: Sparkles }
                              ].map(tab => {
                                  const Icon = tab.icon;
                                  return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setResearchSubTab(tab.id as typeof researchSubTab)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors",
                                            researchSubTab === tab.id 
                                                ? "border-blue-600 text-blue-600 dark:text-blue-400" 
                                                : "border-transparent text-muted hover:text-fg hover:bg-black/5 dark:hover:bg-white/5"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {tab.label}
                                    </button>
                                  );
                              })}
                          </div>
                          
                          {/* Research Content */}
                          <div className="flex-1 relative overflow-hidden">
                              {researchSubTab === "synopsis" && <ContextPanel activeTab="synopsis" onTabChange={handleContextTabChange} />}
                              {researchSubTab === "character" && <ContextPanel activeTab="characters" onTabChange={handleContextTabChange} />}
                              {researchSubTab === "world" && <ContextPanel activeTab="terms" onTabChange={handleContextTabChange} />}
                              {researchSubTab === "scrap" && <ResearchPanel activeTab="scrap" onClose={() => setContextOpen(false)} />}
                              {researchSubTab === "analysis" && <ResearchPanel activeTab="analysis" onClose={() => setContextOpen(false)} />}
                          </div>
                      </div>
                  )}

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
          
          {/* Right Icon Bar (Binder Tab) */}
          <div className="w-14 bg-white dark:bg-[#1e1e1e] border-l border-[#e1e3e1] dark:border-[#444] flex flex-col items-center py-4 gap-6 shrink-0 z-10 transition-colors duration-200">
              
              {/* Research */}
              <button 
                onClick={() => handleRightTabClick("research")} 
                className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors", 
                    activeRightTab === "research" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                )} 
                title={t("sidebar.section.research")}
              >
                  <BookOpen className="w-5 h-5" />
              </button>
              
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
      </div>
    </div>
  );
}
