import {
  CalendarDays,
  Clock,
  Search,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function TimelineSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="사건 검색..." className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:border-border" />
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.events", "메인 플롯")}>
          <TreeItem icon={<CalendarDays className="w-4 h-4" />} label="발단" isActive />
          <TreeItem icon={<CalendarDays className="w-4 h-4" />} label="전개" />
          <TreeItem icon={<CalendarDays className="w-4 h-4" />} label="위기" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.subevents", "서브 플롯")}>
          <TreeItem icon={<Clock className="w-4 h-4" />} label="과거 회상" />
          <TreeItem icon={<Clock className="w-4 h-4" />} label="복선" />
        </SidebarTreeSection>
      </div>

      <div className="px-2 mt-4 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-primary hover:text-primary/90">
          <Plus className="w-4 h-4" /> 새 사건 기록
        </Button>
      </div>
    </div>
  );
}
