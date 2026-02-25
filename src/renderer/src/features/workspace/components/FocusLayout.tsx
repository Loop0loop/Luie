import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@shared/types/utils";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

interface FocusLayoutProps {
  children: ReactNode;
  activeChapterTitle?: string;
  wordCount?: number;
}

export default function FocusLayout({
  children,
  activeChapterTitle,
  wordCount,
}: FocusLayoutProps) {
  const { t } = useTranslation();
  const setUiMode = useEditorStore((state) => state.setUiMode);
  const [showUI, setShowUI] = useState(false);

  // Stealth UI Logic: Show UI only when mouse moves
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowUI(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowUI(false);
      }, 2000); // Hide after 2 seconds of inactivity
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const handleExitFocus = () => {
    setUiMode("default");
  };

  return (
    <div className="w-full h-full bg-background text-foreground relative flex flex-col overflow-hidden transition-colors duration-500">
      
      {/* Top Bar (Stealth) */}
      <div 
        className={cn(
            "absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-50 transition-opacity duration-300 pointer-events-none",
            showUI ? "opacity-100 pointer-events-auto" : "opacity-0"
        )}
      >
        <div className="text-sm font-medium text-muted-foreground/50">
            {activeChapterTitle || "Untitled"}
        </div>
        
        <div className="flex items-center gap-4">
             {/* Fullscreen Toggle (Optional, if OS supports it) */}
             {/* <button className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <Maximize2 className="w-5 h-5" />
             </button> */}
             
             <button 
                onClick={handleExitFocus}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/10 hover:bg-muted/30 transition-all text-muted-foreground hover:text-foreground backdrop-blur-sm"
             >
                <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0">
                    {t("exit")}
                </span>
                <X className="w-5 h-5" />
             </button>
        </div>
      </div>

      {/* Main Content Area - Centered & Max Width */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center">
          <div className="w-full h-full max-w-[700px] flex flex-col relative">
               {children}
          </div>
      </div>

      {/* Bottom Bar (Stealth) - Stats */}
      <div 
        className={cn(
            "absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center z-50 transition-opacity duration-300 pointer-events-none",
            showUI ? "opacity-100 pointer-events-auto" : "opacity-0"
        )}
      >
         <span className="text-xs font-medium text-muted-foreground/40 font-mono">
            {wordCount ?? 0} words
         </span>
      </div>

    </div>
  );
}
