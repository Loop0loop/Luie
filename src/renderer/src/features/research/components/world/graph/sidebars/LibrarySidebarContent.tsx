import {
  Library,
  Search,
  Plus,
  Bookmark,
  Archive,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function LibrarySidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="자료 검색..." className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:border-border" />
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.library", "자료실")}>
          <TreeItem icon={<Library className="w-4 h-4" />} label="고증 자료" isActive />
          <TreeItem icon={<Library className="w-4 h-4" />} label="참고 이미지" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.bookmarks", "즐겨찾기")}>
          <TreeItem icon={<Bookmark className="w-4 h-4" />} label="핵심 설정 논문" />
          <TreeItem icon={<Archive className="w-4 h-4" />} label="나중을 위한 아카이브" />
        </SidebarTreeSection>
      </div>

      <div className="px-2 mt-4 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-primary hover:text-primary/90">
          <Plus className="w-4 h-4" /> 외부 자료 첨부
        </Button>
      </div>
    </div>
  );
}
