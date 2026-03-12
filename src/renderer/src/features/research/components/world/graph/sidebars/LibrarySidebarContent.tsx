import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";
import { Copy, BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LibrarySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full">
      <SidebarTreeSection title={t("world.graph.ide.sidebar.templates", "Templates")}>
        <TreeItem icon={<Copy className="h-4 w-4 text-emerald-400" />} label="Character Template" />
        <TreeItem icon={<Copy className="h-4 w-4 text-purple-400" />} label="Faction Template" />
        <TreeItem icon={<Copy className="h-4 w-4 text-rose-400" />} label="Event Template" />
      </SidebarTreeSection>

      <SidebarTreeSection title={t("world.graph.ide.sidebar.references", "References")}>
        <TreeItem icon={<BookMarked className="h-4 w-4 text-blue-300" />} label="중세 의상" />
        <TreeItem icon={<BookMarked className="h-4 w-4 text-blue-300" />} label="건축 자료" />
        <TreeItem icon={<BookMarked className="h-4 w-4 text-blue-300" />} label="무기 자료" />
      </SidebarTreeSection>
    </div>
  );
}