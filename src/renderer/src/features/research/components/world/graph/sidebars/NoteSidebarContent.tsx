import { Lightbulb, Globe, BookMarked, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

const IDEAS = ["마왕 과거 떡밥", "왕국 몰락 원인"];
const WORLD_NOTES = ["마법 시스템", "신화"];
const PLOT_NOTES = ["시즌1 구조", "사건 전개"];

export function NoteSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.notes.ideas", "Ideas")}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
      >
        {IDEAS.map((label) => (
          <TreeItem key={label} icon={<Lightbulb className="h-[14px] w-[14px] text-yellow-400/70" />} label={label} />
        ))}
      </SidebarTreeSection>

      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.notes.world", "World Notes")}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
      >
        {WORLD_NOTES.map((label) => (
          <TreeItem key={label} icon={<Globe className="h-[14px] w-[14px] text-sky-400/70" />} label={label} />
        ))}
      </SidebarTreeSection>

      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.notes.plot", "Plot Notes")}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
        defaultExpanded={false}
      >
        {PLOT_NOTES.map((label) => (
          <TreeItem key={label} icon={<BookMarked className="h-[14px] w-[14px] text-rose-400/70" />} label={label} />
        ))}
      </SidebarTreeSection>
    </div>
  );
}
