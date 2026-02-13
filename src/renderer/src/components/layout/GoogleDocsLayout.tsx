import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import WindowBar from './WindowBar';
import { cn } from '../../../../shared/types/utils';
import { useUIStore } from '../../stores/uiStore';
import { useTranslation } from "react-i18next";
import { 
  Menu, 
  ChevronLeft, 
  MessageSquareText, 
  Share, 
  Clock, 
  CloudCheck,
  Star
} from "lucide-react";

interface GoogleDocsLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
}

export default function GoogleDocsLayout({ children, sidebar, contextPanel }: GoogleDocsLayoutProps) {
  const { t } = useTranslation();
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
  
  // Google Docs specific state
  
  // Resizing logic (Reuse from MainLayout for now, but applied to specific panels)
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

      const next = Math.min(520, Math.max(240, rect.right - event.clientX));
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
      {/* 1. Window Bar (System Controls + Title) - Google Docs Style */}
      {/* We reuse WindowBar for dragging, but might need to customize its look to blend in */}
      <div className="bg-[#f9fbfd] dark:bg-[#1b1b1b] transition-colors duration-200">
           <WindowBar />
      </div>

      {/* 2. Google Docs Header (Title, Menu, Actions) */}
      <header className="flex items-center px-4 py-1 gap-4 bg-[#f9fbfd] dark:bg-[#1b1b1b] shrink-0 select-none transition-colors duration-200">
          {/* Logo / Home Button */}
          <div className="flex items-center justify-center w-10 h-10 rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer" title={t("common.home")}>
              <div className="w-6 h-8 bg-[#4285F4] rounded-[2px] relative flex items-center justify-center shadow-sm">
                  <div className="w-4 h-0.5 bg-white mb-1 rounded-sm"/>
                  <div className="w-4 h-0.5 bg-white mb-1 rounded-sm"/>
                  <div className="w-2 h-0.5 bg-white rounded-sm mr-auto ml-1"/>
              </div>
          </div>

          <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                 {/* Title */}
                 <span className="text-[18px] text-[#1f1f1f] dark:text-[#e3e3e3] px-1 hover:border hover:border-black dark:hover:border-white rounded cursor-text truncate max-w-[300px]">
                     {t("project.defaults.untitled")}
                 </span>
                 <Star className="w-4 h-4 text-muted hover:text-fg cursor-pointer" />
                 <div title={t("editor.status.saved")}>
                    <CloudCheck className="w-4 h-4 text-muted" />
                 </div>
              </div>
              
              {/* Menu Bar */}
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

      {/* 3. Toolbar Container - Passed down children logic or rendered here? 
          For now, EditorToolbar is rendered inside the Editor component, 
          but in Docs mode we might want to lift it out or style it to look lifted.
          Actually, `EditorToolbar` is part of `Editor.tsx`. 
          GoogleDocsLayout wraps everything.
          
          We might need to rely on the EditorToolbar inside the content to look right, 
          OR we hide that and render a global one here if we refactor `Editor`.
          
          Given the current architecture, `Editor` contains `EditorToolbar`.
          The `EditorToolbar` already has a `DocsToolbar` variant.
          So we just need the LAYOUT to frame it correctly.
      */}

      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
         {/* Left Sidebar (Outline) */}
         <div 
           className={cn(
             "bg-white dark:bg-[#1e1e1e] border-r border-[#c7c7c7] dark:border-[#444] overflow-hidden flex flex-col transition-[width,opacity] duration-300 ease-in-out shrink-0",
             !isSidebarOpen && "border-r-0 opacity-0"
           )}
           style={{ width: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
         >
           {sidebar}
         </div>

         {isSidebarOpen && (
           <div
             className="w-1 shrink-0 cursor-col-resize hover:bg-[#4285F4] transition-colors z-20"
             onPointerDown={(e) => startResize("left", e)}
           />
         )}

         {/* Main Content Area (Gray background, centered paper) */}
         <main className="flex-1 flex flex-col bg-[#f9fbfd] dark:bg-[#1b1b1b] relative min-w-0 z-0 overflow-y-auto items-center transition-colors duration-200">
            {/* The Editor component creates the "Page" look. 
                We just need to ensure the container allows it to be centered.
            */}
            <div className="w-full h-full flex flex-col">
               {/* Toggle Sidebar Button (Floating or integrated) */}
               <div className="absolute top-4 left-4 z-10 print:hidden">
                    <button 
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-1.5 rounded-full bg-[#edf2fa] dark:bg-[#333] hover:bg-[#dbe4f7] dark:hover:bg-[#444] text-[#444746] dark:text-[#e3e3e3] transition-colors shadow-sm"
                        title={isSidebarOpen ? "Close Outline" : "Show Outline"}
                    >
                        {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
               </div>
               
               {children}
            </div>
         </main>
         
         {isContextOpen && ( 
            <div
                className="w-1 shrink-0 cursor-col-resize hover:bg-[#4285F4] transition-colors z-20"
                 onPointerDown={(e) => startResize("right", e)}
            />
         )}

         {/* Right Sidebar (Context/Keep/Tasks) */}
         <div 
           className={cn(
             "bg-white dark:bg-[#1e1e1e] border-l border-[#c7c7c7] dark:border-[#444] overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out",
             !isContextOpen && "border-l-0 opacity-0 pointer-events-none"
           )}
           style={{ width: isContextOpen ? `${contextWidth}px` : "0px" }}
         >
            {contextPanel}
         </div>
         
         {/* Right Side Icon Bar (Like Google Apps) */}
         <div className="w-14 bg-white dark:bg-[#1e1e1e] border-l border-[#e1e3e1] dark:border-[#444] flex flex-col items-center py-4 gap-6 shrink-0 z-10 transition-colors duration-200">
             <button onClick={() => setContextOpen(!isContextOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" title="Calendar">
                 <div className="w-5 h-5 rounded bg-blue-500 text-white text-[10px] flex items-center justify-center">31</div>
             </button>
             <button onClick={() => setContextOpen(!isContextOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" title="Keep">
                 <div className="w-5 h-5 rounded bg-yellow-400 flex items-center justify-center relative shadow-sm">
                     <div className="w-2 h-2 bg-white rounded-full opacity-60"/>
                 </div>
             </button>
             <button onClick={() => setContextOpen(!isContextOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" title="Tasks">
                 <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                     <div className="w-2 h-1 bg-blue-600 rotate-45 mt-[-2px]"/>
                 </div>
             </button>
             <div className="w-5 h-px bg-[#e1e3e1] dark:bg-[#444]"/>
             <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10" title="Add-ons">
                 <Plus className="w-5 h-5 text-[#444746] dark:text-[#c4c7c5]" />
             </button>
         </div>
      </div>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
}
