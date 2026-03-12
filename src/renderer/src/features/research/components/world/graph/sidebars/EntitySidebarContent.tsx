import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { Users, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EntitySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full">
      <SidebarTreeSection title={t("world.graph.ide.sidebar.characters", "Characters")}>
        <TreeItem icon={<Users className="h-4 w-4 text-blue-500" />} label="아르웬" />
        <TreeItem icon={<Users className="h-4 w-4 text-green-500" />} label="리아" />
        <TreeItem icon={<Users className="h-4 w-4 text-red-500" />} label="마왕" />
      </SidebarTreeSection>

      <SidebarTreeSection title={t("world.graph.ide.sidebar.places", "Places")}>
        <TreeItem icon={<MapPin className="h-4 w-4 text-orange-400" />} label="왕도" />
        <TreeItem icon={<MapPin className="h-4 w-4 text-cyan-500" />} label="안개 계곡" />
        <TreeItem icon={<MapPin className="h-4 w-4 text-slate-400" />} label="북부 산맥" />
      </SidebarTreeSection>
    </div>
  );
}