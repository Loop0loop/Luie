import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { Lightbulb, Globe, CheckSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NoteSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full">
      <SidebarTreeSection title={t("world.graph.ide.sidebar.ideas", "Ideas")}>
        <TreeItem icon={<Lightbulb className="h-4 w-4 text-amber-400" />} label="마왕 과거 떡밥" />
        <TreeItem icon={<Lightbulb className="h-4 w-4 text-amber-400" />} label="왕국 몰락 원인" />
      </SidebarTreeSection>

      <SidebarTreeSection title={t("world.graph.ide.sidebar.worldNotes", "World Notes")}>
        <TreeItem icon={<Globe className="h-4 w-4 text-blue-400" />} label="마법 시스템" />
        <TreeItem icon={<Globe className="h-4 w-4 text-blue-400" />} label="신화" />
      </SidebarTreeSection>

      <SidebarTreeSection title={t("world.graph.ide.sidebar.plotNotes", "Plot Notes")}>
        <TreeItem icon={<CheckSquare className="h-4 w-4 text-green-400" />} label="시즌1 구조" />
        <TreeItem icon={<CheckSquare className="h-4 w-4 text-green-400" />} label="사건 전개" />
      </SidebarTreeSection>
    </div>
  );
}