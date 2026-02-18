import { type ReactNode, useState } from "react";
import { type Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Book, Search, Info } from "lucide-react";
import FocusHoverSidebar from "../sidebar/FocusHoverSidebar";
import Ribbon from "../editor/Ribbon";
import WindowBar from "./WindowBar";
import { cn } from "../../../../shared/types/utils";

interface EditorLayoutProps {
  children?: ReactNode;
  sidebar?: ReactNode;
  activeChapterTitle?: string;
  activeChapterContent?: string;
  currentProjectId?: string;
  editor: Editor | null;
  onOpenSettings?: () => void;
  onRenameChapter?: (id: string, newTitle: string) => Promise<void>;
  onSaveChapter?: (title: string, content: string) => Promise<void>;
}

export default function EditorLayout({
    children,
    sidebar,
    activeChapterTitle,
    editor
}: EditorLayoutProps) {
  const { t } = useTranslation();
  const [activeRightTab, setActiveRightTab] = useState<"binder" | "research" | "info">("binder");

  return (
    <div className="flex flex-col h-screen w-screen bg-app text-fg overflow-hidden relative">
      
      {/* 1. App Window Bar (Restored) */}
      <WindowBar title={activeChapterTitle || "Luie Editor"} />

      {/* 2. Top Google Docs Style Toolbar */}
      <Ribbon editor={editor} />

      <div className="flex-1 flex overflow-hidden relative">
      
          {/* LEFT: Auto-hide Navigation Sidebar */}
          <FocusHoverSidebar side="left">
            <div className="h-full flex flex-col bg-panel border-r border-border min-w-[280px]">
               <div className="h-9 px-4 flex items-center bg-surface border-b border-border text-xs font-semibold text-muted font-sans tracking-wide">
                  OUTLINE
               </div>
               <div className="flex-1 overflow-y-auto p-4 text-sm text-muted">
                 {/* Placeholder for TOC */}
                 <p className="italic opacity-50">Headings will appear here...</p>
                 {/* Future: Implement EditorTOC with editor={editor} */}
               </div>
            </div>
          </FocusHoverSidebar>

          {/* RIGHT: Auto-hide Binder/Research Sidebar (Tabbed) */}
          <FocusHoverSidebar side="right">
             <div className="h-full flex flex-row bg-panel border-l border-border min-w-[320px]">
                
                {/* Sidebar Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-panel">
                    <div className="h-9 px-4 flex items-center bg-surface border-b border-border text-xs font-semibold text-muted font-sans tracking-wide justify-between">
                       <span className="uppercase">{activeRightTab}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto w-full">
                        {activeRightTab === "binder" && (
                            <div className="h-full">
                                {/* Project Tree / Binder Content */}
                                {sidebar}
                            </div>
                        )}
                        {activeRightTab === "research" && (
                            <div className="p-4 space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2 w-4 h-4 text-muted" />
                                    <input 
                                        type="text" 
                                        placeholder="Search..." 
                                        className="w-full bg-surface border border-border rounded pl-8 pr-2 py-1.5 text-sm focus:ring-1 focus:ring-accent outline-none"
                                    />
                                </div>
                                <div className="text-sm text-muted text-center pt-4">
                                    No results found.
                                </div>
                            </div>
                        )}
                        {activeRightTab === "info" && (
                            <div className="p-4 space-y-4 text-sm">
                                <div className="bg-surface rounded p-3 border border-border">
                                    <h3 className="font-semibold mb-2 text-fg">Document Statistics</h3>
                                    <div className="flex justify-between py-1 border-b border-border/50">
                                        <span className="text-muted">Words</span>
                                        <span>{editor?.storage.characterCount.words() ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between py-1 border-b border-border/50">
                                        <span className="text-muted">Characters</span>
                                        <span>{editor?.storage.characterCount.characters() ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-muted">Reading Time</span>
                                        <span>{Math.ceil((editor?.storage.characterCount.words() ?? 0) / 200)} min</span>
                                    </div>
                                </div>
                                
                                <div className="bg-surface rounded p-3 border border-border">
                                    <h3 className="font-semibold mb-2 text-fg">Metadata</h3>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-muted text-xs">Title</span>
                                        <span className="truncate">{activeChapterTitle || "Untitled"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Rightmost Vertical Tab Bar (Google Docs style side panel) */}
                <div className="w-12 bg-surface border-l border-border flex flex-col items-center py-2 gap-2">
                    <TabButton 
                        icon={<Book className="w-5 h-5" />} 
                        isActive={activeRightTab === "binder"} 
                        onClick={() => setActiveRightTab("binder")} 
                        title="Binder"
                    />
                    <TabButton 
                        icon={<Search className="w-5 h-5" />} 
                        isActive={activeRightTab === "research"} 
                        onClick={() => setActiveRightTab("research")} 
                        title="Research"
                    />
                    <TabButton 
                        icon={<Info className="w-5 h-5" />} 
                        isActive={activeRightTab === "info"} 
                        onClick={() => setActiveRightTab("info")} 
                        title="Info"
                    />
                </div>

             </div>
          </FocusHoverSidebar>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden bg-[#f3f4f6] dark:bg-[#1a1a1a] relative flex flex-col items-center justify-center">
                 
             {/* Scrollable Page Container */}
             <div className="flex-1 w-full overflow-y-auto p-8 custom-scrollbar scroll-smooth flex flex-col items-center">
                 {/* The Page */}
                 <div className="w-[816px] min-h-[1056px] bg-white dark:bg-[#1e1e1e] shadow-2xl border border-black/5 dark:border-white/5 py-12 px-12 transition-all duration-200 ease-out my-auto">
                    {/* Title inside page */}
                    {activeChapterTitle && (
                        <h1 className="text-3xl font-bold mb-8 pb-4 border-b border-border/50 text-fg">
                            {activeChapterTitle}
                        </h1>
                    )}
                    
                    {/* The Editor Content */}
                    <div className="editor-content-wrapper min-h-[500px]">
                        {children}
                    </div>
                 </div>

                 {/* Bottom spacing */}
                 <div className="h-12 w-full shrink-0" />
             </div>

             {/* Status Bar (Minimal, absolute bottom) */}
             <div className="absolute bottom-4 right-8 px-3 py-1 bg-surface/80 backdrop-blur-md border border-border rounded-full text-[11px] text-muted select-none z-30 flex items-center gap-4 shadow-sm opacity-50 hover:opacity-100 transition-opacity">
                 <span>Page 1 of 1</span>
                 <span>0 words</span>
                 <span className="cursor-pointer hover:text-fg">{t("common.language.options.ko")}</span>
             </div>
          </div>
      </div>
    </div>
  );
}

function TabButton({ icon, isActive, onClick, title }: { icon: ReactNode; isActive: boolean; onClick: () => void; title: string }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "p-2 rounded-full transition-colors flex items-center justify-center",
                isActive ? "bg-accent/10 text-accent" : "text-muted hover:text-fg hover:bg-black/5 dark:hover:bg-white/5"
            )}
        >
            {icon}
        </button>
    )
}
