import {
  Search,
  Plus,
  
  FileText,
  Pin,
  Hash
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function NoteSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-3 mb-4 mt-2">
        <div className="relative flex items-center group">
          <Search className="absolute left-2.5 h-[14px] w-[14px] text-muted-foreground/60 transition-colors group-focus-within:text-foreground/80" />
          <input 
            type="text"
            placeholder={t("world.graph.ide.sidebar.search", "Search notes...")}
            className="w-full bg-surface hover:bg-muted/80 focus:bg-background border border-transparent focus:border-border/50 focus:ring-1 focus:ring-ring/20 rounded-md h-[28px] pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all"
          />
          <div className="absolute right-2 flex items-center justify-center h-4 px-1 rounded border border-border/40 bg-background/50 text-[9px] font-medium text-muted-foreground/60 pointer-events-none select-none">
            ⌘O
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.notes.pinned", "Pinned (고정됨)")}
        >
          <TreeItem icon={<Pin className="w-[15px] h-[15px] opacity-80" />} label="World Rules" />
          <TreeItem icon={<Pin className="w-[15px] h-[15px] opacity-80" />} label="Main Char Sheet" isActive />
        </SidebarTreeSection>

        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.notes.folders", "Notes (노트)")}
          actionIcon={<Plus className="w-[14px] h-[14px]" />}
        >
          <TreeItem isFolder isOpen label="Idea Drafts">
            <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Ending Variations" />
            <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Dialogue Snippets" />
          </TreeItem>
          <TreeItem isFolder label="Story Logic">
            <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Act 2 Pacing" />
            <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Foreshadowing Setup" />
          </TreeItem>
        </SidebarTreeSection>

        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.notes.tags", "Tags (태그)")}
          defaultExpanded={false}
        >
          <TreeItem icon={<Hash className="w-[15px] h-[15px] text-muted-foreground/60" />} label="important" meta="12" />
          <TreeItem icon={<Hash className="w-[15px] h-[15px] text-muted-foreground/60" />} label="review_needed" meta="5" />
          <TreeItem icon={<Hash className="w-[15px] h-[15px] text-muted-foreground/60" />} label="scrapped" meta="2" />
        </SidebarTreeSection>
      </div>
    </div>
  );
}
