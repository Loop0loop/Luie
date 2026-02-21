import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import WindowBar from './WindowBar';
import { PanelRightClose, PanelRightOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Panel, Group as PanelGroup } from "react-resizable-panels";
import { cn } from '../../../../shared/types/utils';
import { useUIStore } from '../../stores/uiStore';
import { useTranslation } from "react-i18next";
import { EditorDropZones } from "../common/EditorDropZones";

interface MainLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  contextPanel?: ReactNode;
  additionalPanels?: ReactNode;
}

export default function MainLayout({ children, sidebar, contextPanel, additionalPanels }: MainLayoutProps) {
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeResizerRef = useRef<"left" | "right" | null>(null);

  const startResize = useCallback((side: "left" | "right", event: ReactPointerEvent) => {
    event.preventDefault();
    activeResizerRef.current = side;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }, []);

  useEffect(() => {
    const LEFT_MIN = 200;
    const LEFT_MAX = 420;
    const RIGHT_MIN = 240;
    const RIGHT_MAX = 520;

    const handlePointerMove = (event: PointerEvent) => {
      if (!activeResizerRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      if (activeResizerRef.current === "left") {
        const next = Math.min(LEFT_MAX, Math.max(LEFT_MIN, event.clientX - rect.left));
        setSidebarWidth(Math.round(next));
        return;
      }

      const next = Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, rect.right - event.clientX));
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
    <div className="flex flex-col h-screen bg-app text-fg">
      <WindowBar />
      
      <div ref={containerRef} className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div 
          className={cn(
            "bg-sidebar border-r border-white/5 overflow-hidden flex flex-col transition-[width,opacity] duration-300 ease-in-out z-10 shrink-0",
            !isSidebarOpen && "border-r-0 opacity-0"
          )}
          style={{ width: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
        >
          {sidebar}
        </div>

        {isSidebarOpen && (
          <div
            className="w-1 shrink-0 cursor-col-resize hover:bg-accent/30 active:bg-accent transition-colors z-20"
            onPointerDown={(event) => startResize("left", event)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-app relative min-w-0 z-0">
          <EditorDropZones />
          <div className="flex items-center px-4 py-2 h-12 shrink-0">
             <button 
               className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
               onClick={() => setSidebarOpen(!isSidebarOpen)}
               title={isSidebarOpen ? t("mainLayout.tooltip.sidebarCollapse") : t("mainLayout.tooltip.sidebarExpand")}
             >
               {isSidebarOpen ? (
                 <PanelLeftClose className="icon-xl" />
               ) : (
                 <PanelLeftOpen className="icon-xl" />
               )}
             </button>
             
             <div className="flex-1" />

             <button 
               className="bg-transparent border-none text-muted cursor-pointer p-2 rounded-md flex items-center justify-center transition-all hover:bg-active hover:text-fg"
               onClick={() => setContextOpen(!isContextOpen)}
               title={isContextOpen ? t("mainLayout.tooltip.contextCollapse") : t("mainLayout.tooltip.contextExpand")}
             >
               {isContextOpen ? (
                 <PanelRightClose className="icon-xl" />
               ) : (
                 <PanelRightOpen className="icon-xl" />
               )}
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto flex flex-col">
            <PanelGroup orientation="horizontal" className="flex w-full h-full flex-1 overflow-hidden relative">
              <Panel defaultSize={50} minSize={20} className="min-w-0 bg-canvas relative flex flex-col">
                {children}
              </Panel>
              {additionalPanels}
            </PanelGroup>
          </div>
        </main>

        {isContextOpen && (
          <div
            className="w-1 shrink-0 cursor-col-resize hover:bg-accent/30 active:bg-accent transition-colors z-20"
            onPointerDown={(event) => startResize("right", event)}
          />
        )}

        {/* Context Panel */}
        <div 
          className={cn(
            "bg-panel border-l border-white/5 overflow-hidden flex flex-col shrink-0 min-w-0 transition-[width,opacity] duration-300 ease-in-out z-10",
            !isContextOpen && "border-l-0 opacity-0 pointer-events-none"
          )}
          style={{ width: isContextOpen ? `${contextWidth}px` : "0px" }}
        >
           {contextPanel}
        </div>
      </div>
    </div>
  );
}
