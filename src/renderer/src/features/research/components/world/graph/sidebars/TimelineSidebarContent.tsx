import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { Calendar, Users, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

export function TimelineSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full">
      <SidebarTreeSection title={t("world.graph.ide.sidebar.events", "Events")}>
        <TreeItem icon={<Calendar className="h-4 w-4 text-rose-500" />} label="붉은 밤" />
        <TreeItem icon={<Calendar className="h-4 w-4 text-amber-500" />} label="왕도 함락" />
        <TreeItem icon={<Calendar className="h-4 w-4 text-purple-500" />} label="마왕 부활" />
      </SidebarTreeSection>

      <SidebarTreeSection title={t("world.graph.ide.sidebar.characters", "Characters")}>
        <TreeItem icon={<Users className="h-4 w-4 text-blue-500" />} label="아르웬" />
        <TreeItem icon={<Users className="h-4 w-4 text-green-500" />} label="리아" />
        <TreeItem icon={<Users className="h-4 w-4 text-red-500" />} label="마왕" />
      </SidebarTreeSection>

      <SidebarTreeSection title={t("world.graph.ide.sidebar.era", "Era")}>
        <TreeItem icon={<Clock className="h-4 w-4 text-slate-500" />} label="고대" />
        <TreeItem icon={<Clock className="h-4 w-4 text-slate-400" />} label="왕국 시대" />
        <TreeItem icon={<Clock className="h-4 w-4 text-slate-300" />} label="현재" isActive />
      </SidebarTreeSection>
    </div>
  );
}