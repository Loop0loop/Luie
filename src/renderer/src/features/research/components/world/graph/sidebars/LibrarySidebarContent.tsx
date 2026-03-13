import {
  Search,
  Plus,
  
  Link2,
  Image,
  Globe,
  Youtube
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function LibrarySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="px-3 mb-4 mt-2">
        <div className="relative flex items-center group">
          <Search className="absolute left-2.5 h-[14px] w-[14px] text-muted-foreground/60 transition-colors group-focus-within:text-foreground/80" />
          <input 
            type="text"
            placeholder={t("world.graph.ide.sidebar.search", "Search library...")}
            className="w-full bg-surface/50 hover:bg-surface focus:bg-surface border border-transparent focus:border-border/50 focus:ring-1 focus:ring-ring/20 rounded-md h-[28px] pl-8 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-all"
          />
          <div className="absolute right-2 flex items-center justify-center h-4 px-1 rounded border border-border/40 bg-panel/50 text-[9px] font-medium text-muted-foreground/60 pointer-events-none select-none">
            ⌘L
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
        <SidebarTreeSection 
          title={t("world.graph.ide.sidebar.library.collections", "Collections")}
          actionIcon={<Plus className="w-[14px] h-[14px]" />}
        >
          <TreeItem isFolder isOpen label="Reference Images">
            <TreeItem icon={<Image className="w-[15px] h-[15px] opacity-80" />} label="Medieval Clothing" isActive />
            <TreeItem icon={<Image className="w-[15px] h-[15px] opacity-80" />} label="Weapon Concept Art" />
          </TreeItem>
          
          <TreeItem isFolder label="Web Links">
            <TreeItem icon={<Globe className="w-[15px] h-[15px] opacity-80" />} label="Wiki: Holy Roman Empire" />
            <TreeItem icon={<Youtube className="w-[15px] h-[15px] text-red-500/80" />} label="Hema Combat ref" />
            <TreeItem icon={<Link2 className="w-[15px] h-[15px] opacity-80" />} label="Fantasy Name Generator" />
          </TreeItem>
        </SidebarTreeSection>
      </div>
    </div>
  );
}
