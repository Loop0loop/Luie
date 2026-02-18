import {
  type ReactNode,
  useState,
  useRef,
  useEffect,
  Suspense
} from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import WindowBar from "./WindowBar";
import Ribbon from "../editor/Ribbon";
import { cn } from "../../../../shared/types/utils";
import InspectorPanel from "../editor/InspectorPanel";
import { Menu, ChevronLeft } from "lucide-react";

interface ScrivenerLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterId?: string;
  activeChapterTitle?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
}

import { useUIStore } from "../../stores/uiStore";
import WikiDetailView from "../research/wiki/WikiDetailView";
import WorldSection from "../research/WorldSection";
import MemoMainView from "../research/memo/MemoMainView";
import AnalysisSection from "../research/AnalysisSection";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 400;
const MIN_INSPECTOR_WIDTH = 240;
const MAX_INSPECTOR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 260;
const DEFAULT_INSPECTOR_WIDTH = 300;

export default function ScrivenerLayout({
  children,
  sidebar,
  activeChapterId,
  activeChapterTitle,
  editor,
  onOpenSettings,
}: ScrivenerLayoutProps) {
  const { t } = useTranslation();
  const { mainView } = useUIStore();

  // Layout State
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Resizing Logic
  const isResizingRef = useRef<"sidebar" | "inspector" | null>(null);

  const startResize = (target: "sidebar" | "inspector", e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = target;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      if (isResizingRef.current === "sidebar") {
        const newWidth = Math.max(
          MIN_SIDEBAR_WIDTH,
          Math.min(MAX_SIDEBAR_WIDTH, e.clientX)
        );
        setSidebarWidth(newWidth);
      } else if (isResizingRef.current === "inspector") {
        const newWidth = Math.max(
          MIN_INSPECTOR_WIDTH,
          Math.min(MAX_INSPECTOR_WIDTH, window.innerWidth - e.clientX)
        );
        setInspectorWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const renderMainContent = () => {
    switch (mainView.type) {
      case "character":
        return <WikiDetailView />;
      case "world":
        return <WorldSection />;
      case "memo":
        return <MemoMainView />;
      case "analysis":
        return <AnalysisSection />;
      case "editor":
      default:
        return children;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative border-t border-transparent">
      {/* 1. WindowBar */}
      <WindowBar title={activeChapterTitle || "Luie Scrivener Mode"} />

      {/* 2. Top Toolbar (Ribbon) - Full Width */}
      <div className="shrink-0 z-30 shadow-sm relative">
        <Ribbon
          editor={editor}
          onOpenSettings={onOpenSettings}
          activeChapterId={activeChapterId}
        />
        {/* Scrivener-specific toolbar items could go here if separate */}
      </div>

      {/* 3. Main 3-Pane Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Pane 1: Binder (Sidebar) */}
        <div
          className={cn(
            "bg-panel border-r border-border flex flex-col shrink-0 transition-[width,opacity] duration-200 ease-in-out relative",
            !isSidebarOpen && "w-0 opacity-0 overflow-hidden border-none"
          )}
          style={{ width: isSidebarOpen ? sidebarWidth : 0 }}
        >
           {sidebar}
           
           {/* Resizer Handle */}
           {isSidebarOpen && (
             <div
               className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 z-10 transition-colors"
               onMouseDown={(e) => startResize("sidebar", e)}
             />
           )}
        </div>

        {/* Sidebar Toggle (Floating if closed) */}
        {!isSidebarOpen && (
             <button
                onClick={() => setIsSidebarOpen(true)}
                className="absolute left-2 top-2 z-50 p-2 bg-surface border border-border rounded-full shadow-md hover:bg-surface-hover"
                title={t("sidebar.toggle.open")}
             >
                <Menu className="w-4 h-4" />
             </button>
        )}

        {/* Pane 2: Editor (Center) */}
        <div className="flex-1 flex flex-col min-w-0 bg-canvas relative z-0">
             {/* Header / Title Bar of Editor Pane? (Like Scrivener Header) */}
             <div className="h-8 bg-surface border-b border-border flex items-center px-4 justify-between shrink-0">
                 <span className="font-semibold text-sm truncate opacity-80">
                    {activeChapterTitle || t("project.defaults.untitled")}
                 </span>
                 <div className="flex items-center gap-2">
                    {/* View Mode Toggles could be here */}
                 </div>
             </div>

             {/* Editor Area */}
             <div className="flex-1 overflow-hidden relative">
                   {/* Reuse Editor Component but strict layout */}
                   {/* World and Analysis views need full width/height without padding */}
                   {(mainView.type === "world" || mainView.type === "analysis") ? (
                       <div className="h-full w-full bg-white dark:bg-[#1e1e1e]">
                           {renderMainContent()}
                       </div>
                   ) : (
                       <div className="h-full w-full overflow-y-auto custom-scrollbar p-8 bg-white dark:bg-[#1e1e1e]">
                           <div className="max-w-3xl mx-auto min-h-[500px]">
                               {renderMainContent()}
                           </div>
                       </div>
                   )}
             </div>
             
             {/* Footer Info */}
             <div className="h-6 bg-surface border-t border-border flex items-center px-3 text-xs text-muted justify-between shrink-0">
                 <span>{/* Word Count etc */}</span>
                 <span>Target: 2000 words</span>
             </div>
        </div>

        {/* Pane 3: Inspector (Right) */}
        <div
           className={cn(
             "bg-panel border-l border-border flex flex-col shrink-0 transition-[width,opacity] duration-200 ease-in-out relative",
             !isInspectorOpen && "w-0 opacity-0 overflow-hidden border-none"
           )}
           style={{ width: isInspectorOpen ? inspectorWidth : 0 }}
        >
             <Suspense fallback={<div className="p-4 text-xs">Loading Inspector...</div>}>
                <InspectorPanel key={activeChapterId} activeChapterId={activeChapterId} />
             </Suspense>

             {/* Resizer Handle */}
             {isInspectorOpen && (
                <div
                  className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/50 z-10 transition-colors"
                  onMouseDown={(e) => startResize("inspector", e)}
                />
             )}
        </div>
        
         {/* Inspector Toggle (Floating if closed) */}
         {!isInspectorOpen && (
             <button
                onClick={() => setIsInspectorOpen(true)}
                className="absolute right-2 top-2 z-50 p-2 bg-surface border border-border rounded-full shadow-md hover:bg-surface-hover"
                title="Open Inspector"
             >
                <ChevronLeft className="w-4 h-4" />
             </button>
        )}

      </div>
    </div>
  );
}
