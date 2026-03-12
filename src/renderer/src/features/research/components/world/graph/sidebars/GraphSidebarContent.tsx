import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { Users, Calendar, MapPin, Flag, BookOpen, Link, ArrowRight, Activity, Globe, CheckSquare, Layers, Target, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

export function GraphSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.entities", "Entities")}>
          <TreeItem icon={<Users className="h-4 w-4" />} label="Characters" />
          <TreeItem icon={<Calendar className="h-4 w-4" />} label="Events" />
          <TreeItem icon={<MapPin className="h-4 w-4" />} label="Places" />
          <TreeItem icon={<Flag className="h-4 w-4" />} label="Factions" />
          <TreeItem icon={<BookOpen className="h-4 w-4" />} label="Rules" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.relations", "Relations")}>
          <TreeItem icon={<Link className="h-4 w-4" />} label="belongs_to" />
          <TreeItem icon={<ArrowRight className="h-4 w-4" />} label="causes" />
          <TreeItem icon={<Activity className="h-4 w-4" />} label="controls" />
          <TreeItem icon={<Globe className="h-4 w-4" />} label="located_in" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.filters", "Filters")}>
          {/* Using CheckSquare as a placeholder for a checkbox UI */}
          <TreeItem icon={<CheckSquare className="h-4 w-4" />} label="Character" isActive />
          <TreeItem icon={<CheckSquare className="h-4 w-4" />} label="Event" isActive />
          <TreeItem icon={<CheckSquare className="h-4 w-4" />} label="Place" isActive />
        </SidebarTreeSection>
      </div>

      {/* Layout actions at the bottom */}
      <div className="p-3 border-t border-border/40 shrink-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted px-1 mb-2 block">
          {t("world.graph.ide.sidebar.layout", "Layout")}
        </span>
        <div className="flex flex-col gap-1.5">
          <button className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-muted hover:text-fg hover:bg-element rounded-md transition-colors text-left">
            <Layers className="h-4 w-4" /> Auto Layout
          </button>
          <button className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-muted hover:text-fg hover:bg-element rounded-md transition-colors text-left">
            <Target className="h-4 w-4" /> Cluster
          </button>
          <button className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-muted hover:text-fg hover:bg-element rounded-md transition-colors text-left">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}