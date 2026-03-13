import { FileText, Image, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

const TEMPLATES = ["Character Template", "Faction Template", "Event Template"];
const REFERENCES = ["중세 의상", "건축 자료", "무기 자료"];

export function LibrarySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.templates", "Templates")}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
      >
        {TEMPLATES.map((label) => (
          <TreeItem key={label} icon={<FileText className="h-[14px] w-[14px] text-indigo-400/70" />} label={label} />
        ))}
      </SidebarTreeSection>

      <SidebarTreeSection
        title={t("world.graph.ide.sidebar.library.references", "References")}
        actionIcon={<Plus className="h-3.5 w-3.5" />}
      >
        {REFERENCES.map((label) => (
          <TreeItem key={label} icon={<Image className="h-[14px] w-[14px] text-emerald-400/70" />} label={label} />
        ))}
      </SidebarTreeSection>
    </div>
  );
}
