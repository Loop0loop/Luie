import {
  Search,
  Plus,
  
  FileText,
  CalendarDays,
  Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function TimelineSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-3 mb-4 mt-2">
        <div className="relative flex items-center group">
          <Search className="absolute left-2.5 h-[14px] w-[14px] text-muted-foreground/60 transition-colors group-focus-within:text-foreground/80" />
          <input 
            type="text"
            placeholder={t("world.graph.ide.sidebar.search", "Search timeline...")}
            className="w-full bg-surface hover:bg-muted/80 focus:bg-background border border-transparent focus:border-border/50 focus:ring-1 focus:ring-ring/20 rounded-md h-[28px] pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all"
          />
          <div className="absolute right-2 flex items-center justify-center h-4 px-1 rounded border border-border/40 bg-background/50 text-[9px] font-medium text-muted-foreground/60 pointer-events-none select-none">
            ⌘D
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.events.main", "Main Plot (주요 사건)")}
          actionIcon={<Plus className="w-[14px] h-[14px]" />}
        >
          <TreeItem isFolder isOpen label="Act 1 (발단)">
            <TreeItem icon={<CalendarDays className="w-[15px] h-[15px] opacity-80" />} label="Village Attack" isActive />
            <TreeItem icon={<CalendarDays className="w-[15px] h-[15px] opacity-80" />} label="Meeting the Party" />
          </TreeItem>
          <TreeItem isFolder label="Act 2 (전개)">
            <TreeItem icon={<CalendarDays className="w-[15px] h-[15px] opacity-80" />} label="First Dungeon" />
            <TreeItem icon={<CalendarDays className="w-[15px] h-[15px] opacity-80" />} label="The Betrayal" />
          </TreeItem>
        </SidebarTreeSection>

        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.events.sub", "Sub Plots (서브 플롯)")}
          defaultExpanded={false}
          actionIcon={<Plus className="w-[14px] h-[14px]" />}
        >
          <TreeItem isFolder label="Flashbacks">
            <TreeItem icon={<Clock className="w-[15px] h-[15px] opacity-80" />} label="Master's Death" />
          </TreeItem>
          <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Sword Origins" />
        </SidebarTreeSection>
      </div>
    </div>
  );
}
