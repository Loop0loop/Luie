import {
  Search,
  Plus,
  Filter,
  Users,
  CalendarDays,
  MapPin,
  Flag,
  BookOpen,
  Link,
  ArrowRight,
  Activity,
  Globe,
  Settings2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function GraphSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-transparent">
      
      {/* Search Bar - Professional Mode */}
      <div className="px-3 mb-4 mt-2">
        <div className="relative flex items-center group">
          <Search className="absolute left-2.5 h-[14px] w-[14px] text-muted-foreground/60 transition-colors group-focus-within:text-foreground/80" />
          <input 
            type="text"
            placeholder={t("world.graph.ide.sidebar.search", "Search graph nodes...")}
            className="w-full bg-surface/50 hover:bg-surface focus:bg-surface border border-transparent focus:border-border/50 focus:ring-1 focus:ring-ring/20 rounded-md h-[28px] pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all"
          />
          <div className="absolute right-2 flex items-center justify-center h-4 px-1 rounded border border-border/40 bg-panel/50 text-[9px] font-medium text-muted-foreground/60 pointer-events-none select-none">
            ⌘F
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.nodes", "Node Graph")}
          actionIcon={<Settings2 className="w-[14px] h-[14px]" />}
        >
          <TreeItem icon={<Users className="w-[15px] h-[15px] text-blue-500/80" />} label="Characters" isActive meta="34" />
          <TreeItem icon={<CalendarDays className="w-[15px] h-[15px] text-emerald-500/80" />} label="Events" meta="12" />
          <TreeItem icon={<MapPin className="w-[15px] h-[15px] text-orange-500/80" />} label="Locations" meta="8" />
          <TreeItem icon={<Flag className="w-[15px] h-[15px] text-purple-500/80" />} label="Factions" meta="4" />
          <TreeItem icon={<BookOpen className="w-[15px] h-[15px] text-yellow-500/80" />} label="Lore" meta="15" />
        </SidebarTreeSection>

        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.relations", "Relations")}
          actionIcon={<Plus className="w-[14px] h-[14px]" />}
        >
          <TreeItem isFolder isOpen label="Social Links">
            <TreeItem icon={<Link className="w-[15px] h-[15px] opacity-80" />} label="Family" />
            <TreeItem icon={<Link className="w-[15px] h-[15px] opacity-80" />} label="Allies" />
            <TreeItem icon={<Link className="w-[15px] h-[15px] opacity-80" />} label="Enemies" />
          </TreeItem>
          <TreeItem isFolder label="Spatial Links">
            <TreeItem icon={<Globe className="w-[15px] h-[15px] opacity-80" />} label="Location Based" />
          </TreeItem>
          <TreeItem isFolder label="Causality">
            <TreeItem icon={<ArrowRight className="w-[15px] h-[15px] opacity-80" />} label="Cause & Effect" />
            <TreeItem icon={<Activity className="w-[15px] h-[15px] opacity-80" />} label="Interactions" />
          </TreeItem>
        </SidebarTreeSection>

        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.filters", "Saved Views")}
          defaultExpanded={false}
          actionIcon={<Filter className="w-[14px] h-[14px]" />}
        >
          <TreeItem icon={<Settings2 className="w-[15px] h-[15px] opacity-80" />} label="Protagonist Web" />
          <TreeItem icon={<Settings2 className="w-[15px] h-[15px] opacity-80" />} label="Act 1 Timeline" />
        </SidebarTreeSection>
      </div>
    </div>
  );
}
