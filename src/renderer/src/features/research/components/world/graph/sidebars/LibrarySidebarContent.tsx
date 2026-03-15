import {
  Archive,
  Boxes,
  CalendarRange,
  Network,
  NotebookPen,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function LibrarySidebarContent() {
  const { t } = useTranslation();
  
  const activeLibraryTab = useGraphIdeStore((state) => state.activeLibraryTab);
  const setActiveLibraryTab = useGraphIdeStore((state) => state.setActiveLibraryTab);

  return (
    <div className="flex h-full flex-col overflow-y-auto pb-8">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.title", "Library Categories")}
        actionIcon={<Archive className="h-3.5 w-3.5" />}
      >
        <TreeItem
          icon={<Network className="h-[14px] w-[14px] text-indigo-400/80" />}
          label={t("world.graph.ide.sidebar.library.graph", "그래프 모듈")}
          isActive={activeLibraryTab === "graph"}
          onClick={() => setActiveLibraryTab("graph")}
        />

        <TreeItem
          icon={<CalendarRange className="h-[14px] w-[14px] text-sky-400/80" />}
          label={t("world.graph.ide.sidebar.library.timeline", "타임라인 모듈")}
          isActive={activeLibraryTab === "timeline"}
          onClick={() => setActiveLibraryTab("timeline")}
        />

        <TreeItem
          icon={<NotebookPen className="h-[14px] w-[14px] text-emerald-400/80" />}
          label={t("world.graph.ide.sidebar.library.note", "노트 에디터 모듈")}
          isActive={activeLibraryTab === "note"}
          onClick={() => setActiveLibraryTab("note")}
        />

        <TreeItem
          icon={<Boxes className="h-[14px] w-[14px] text-rose-400/80" />}
          label={t("world.graph.ide.sidebar.library.entity", "엔티티 모듈")}
          isActive={activeLibraryTab === "entity"}
          onClick={() => setActiveLibraryTab("entity")}
        />
      </SidebarTreeSection>
    </div>
  );
}
