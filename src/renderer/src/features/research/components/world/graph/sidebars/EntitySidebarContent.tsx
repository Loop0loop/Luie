import {
  Users,
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function EntitySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="요소 검색..." className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:border-border" />
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.entities", "요소 목록")}>
          <TreeItem icon={<Users className="w-4 h-4" />} label="주요 인물" isActive />
          <TreeItem icon={<Users className="w-4 h-4" />} label="조연" />
        </SidebarTreeSection>
      </div>

      <div className="px-2 mt-4 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-muted-foreground hover:text-foreground">
          <Filter className="w-4 h-4" /> 속성 필터링
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-primary hover:text-primary/90">
          <Plus className="w-4 h-4" /> 새 요소 생성
        </Button>
      </div>
    </div>
  );
}
