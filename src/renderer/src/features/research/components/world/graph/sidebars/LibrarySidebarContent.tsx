import {
  Archive,
  Boxes,
  CalendarRange,
  Network,
  NotebookPen,
  Search,
  PackageOpen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { useGraphPluginStore } from "@renderer/features/research/stores/graphPluginStore";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function LibrarySidebarContent() {
  const { t } = useTranslation();
  
  const activeLibraryTab = useGraphIdeStore((state) => state.activeLibraryTab);
  const activeLibrarySection = useGraphIdeStore((state) => state.activeLibrarySection);
  const setActiveLibraryTab = useGraphIdeStore((state) => state.setActiveLibraryTab);
  const setActiveLibrarySection = useGraphIdeStore((state) => state.setActiveLibrarySection);
  
  const installed = useGraphPluginStore((state) => state.installed);
  const available = useGraphPluginStore((state) => state.catalog);

  // Helper to determine active state of a node
  const isActive = (tab: typeof activeLibraryTab, section: typeof activeLibrarySection) => {
    return activeLibraryTab === tab && activeLibrarySection === section;
  };

  const handleSelect = (tab: typeof activeLibraryTab, section: typeof activeLibrarySection) => {
    setActiveLibraryTab(tab);
    setActiveLibrarySection(section);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-8">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.title", "Plugin Library")}
        actionIcon={<Archive className="h-3.5 w-3.5" />}
      >
        <TreeItem
          icon={<Network className="h-[14px] w-[14px] text-indigo-400/80" />}
          label={t("world.graph.ide.sidebar.library.graph", "그래프 모듈")}
          isFolder
          isOpen={activeLibraryTab === "graph"}
        >
          <TreeItem
            icon={<Search className="h-[12px] w-[12px] opacity-70" />}
            label="탐색 (Browse)"
            isActive={isActive("graph", "browse")}
            onClick={(e) => { e.stopPropagation(); handleSelect("graph", "browse"); }}
            meta={
              <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-500">
                {available.length}
              </span>
            }
          />
          <TreeItem
            icon={<PackageOpen className="h-[12px] w-[12px] opacity-70" />}
            label="설치됨 (Installed)"
            isActive={isActive("graph", "installed")}
            onClick={(e) => { e.stopPropagation(); handleSelect("graph", "installed"); }}
            meta={
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-bold text-indigo-500">
                {installed.length}
              </span>
            }
          />
        </TreeItem>

        <TreeItem
          icon={<CalendarRange className="h-[14px] w-[14px] text-sky-400/80" />}
          label={t("world.graph.ide.sidebar.library.timeline", "타임라인 모듈")}
          isFolder
          isOpen={activeLibraryTab === "timeline"}
        >
          <TreeItem
            icon={<Search className="h-[12px] w-[12px] opacity-70" />}
            label="탐색 (Browse)"
            isActive={isActive("timeline", "browse")}
            onClick={(e) => { e.stopPropagation(); handleSelect("timeline", "browse"); }}
          />
          <TreeItem
            icon={<PackageOpen className="h-[12px] w-[12px] opacity-70" />}
            label="설치됨 (Installed)"
            isActive={isActive("timeline", "installed")}
            onClick={(e) => { e.stopPropagation(); handleSelect("timeline", "installed"); }}
            meta={
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">1</span>
            }
          />
        </TreeItem>

        <TreeItem
          icon={<NotebookPen className="h-[14px] w-[14px] text-emerald-400/80" />}
          label={t("world.graph.ide.sidebar.library.note", "노트 에디터 모듈")}
          isFolder
          isOpen={activeLibraryTab === "note"}
        >
          <TreeItem
            icon={<Search className="h-[12px] w-[12px] opacity-70" />}
            label="탐색 (Browse)"
            isActive={isActive("note", "browse")}
            onClick={(e) => { e.stopPropagation(); handleSelect("note", "browse"); }}
          />
          <TreeItem
            icon={<PackageOpen className="h-[12px] w-[12px] opacity-70" />}
            label="설치됨 (Installed)"
            isActive={isActive("note", "installed")}
            onClick={(e) => { e.stopPropagation(); handleSelect("note", "installed"); }}
            meta={
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">1</span>
            }
          />
        </TreeItem>

        <TreeItem
          icon={<Boxes className="h-[14px] w-[14px] text-rose-400/80" />}
          label={t("world.graph.ide.sidebar.library.entity", "엔티티 모듈")}
          isFolder
          isOpen={activeLibraryTab === "entity"}
        >
          <TreeItem
            icon={<Search className="h-[12px] w-[12px] opacity-70" />}
            label="탐색 (Browse)"
            isActive={isActive("entity", "browse")}
            onClick={(e) => { e.stopPropagation(); handleSelect("entity", "browse"); }}
          />
          <TreeItem
            icon={<PackageOpen className="h-[12px] w-[12px] opacity-70" />}
            label="설치됨 (Installed)"
            isActive={isActive("entity", "installed")}
            onClick={(e) => { e.stopPropagation(); handleSelect("entity", "installed"); }}
            meta={
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">1</span>
            }
          />
        </TreeItem>
      </SidebarTreeSection>
    </div>
  );
}
