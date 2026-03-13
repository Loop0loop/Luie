import {
  Search,
  Plus,
  Filter,
  FileText,
  User,
  MapPin,
  Flag,
  BookOpen
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function EntitySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-transparent">
      
      {/* 
        Professional Search Bar
        Like Linear / Craft - borderless, custom background, subtle placeholder.
      */}
      <div className="px-3 mb-4 mt-2">
        <div className="relative flex items-center group">
          <Search className="absolute left-2.5 h-[14px] w-[14px] text-muted-foreground/60 transition-colors group-focus-within:text-foreground/80" />
          <input 
            type="text"
            placeholder={t("world.graph.ide.sidebar.search", "Search entities...")}
            className="w-full bg-surface hover:bg-muted/80 focus:bg-background border border-transparent focus:border-border/50 focus:ring-1 focus:ring-ring/20 rounded-md h-[28px] pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all"
          />
          {/* Mac style shortcut hint */}
          <div className="absolute right-2 flex items-center justify-center h-4 px-1 rounded border border-border/40 bg-background/50 text-[9px] font-medium text-muted-foreground/60 pointer-events-none select-none">
            ⌘K
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.entities.main", "Entities")}
          actionIcon={<Plus className="w-[14px] h-[14px]" />}
        >
          <TreeItem isFolder isOpen label="Characters (인물)">
            <TreeItem icon={<User className="w-[15px] h-[15px] opacity-80" />} label="Protagonists" isActive meta="3" />
            <TreeItem icon={<User className="w-[15px] h-[15px] opacity-80" />} label="Antagonists" />
            <TreeItem icon={<User className="w-[15px] h-[15px] opacity-80" />} label="Supporting" />
          </TreeItem>
          
          <TreeItem isFolder label="Locations (장소)">
            <TreeItem icon={<MapPin className="w-[15px] h-[15px] opacity-80" />} label="Capital City" />
            <TreeItem icon={<MapPin className="w-[15px] h-[15px] opacity-80" />} label="Mage's Tower" />
          </TreeItem>

          <TreeItem isFolder label="Factions (세력)">
            <TreeItem icon={<Flag className="w-[15px] h-[15px] opacity-80" />} label="The Round Table" />
            <TreeItem icon={<Flag className="w-[15px] h-[15px] opacity-80" />} label="Rebels" />
          </TreeItem>
          
          <TreeItem isFolder label="Lore (설정)">
            <TreeItem icon={<BookOpen className="w-[15px] h-[15px] opacity-80" />} label="Magic System" />
            <TreeItem icon={<BookOpen className="w-[15px] h-[15px] opacity-80" />} label="Ancient History" />
          </TreeItem>
        </SidebarTreeSection>

        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.entities.drafts", "Drafts")}
          defaultExpanded={false}
          actionIcon={<Filter className="w-[14px] h-[14px]" />}
        >
          <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Unnamed Mage" />
          <TreeItem icon={<FileText className="w-[15px] h-[15px] opacity-80" />} label="Abandoned Temple" />
        </SidebarTreeSection>
      </div>
    </div>
  );
}
