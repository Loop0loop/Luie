import {
  FileText,
  Search,
  Plus,
  Tag,
  FolderOpen
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function NoteSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="px-2 pt-2">
        <div className="relative">
          <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="노트 검색..." className="pl-8 h-8 text-xs bg-muted/50 border-transparent focus:border-border" />
        </div>
      </div>

      <div className="space-y-1 mb-4">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.notes", "최근 문서")}>
          <TreeItem icon={<FileText className="w-4 h-4" />} label="아이디어_스케치" isActive />
          <TreeItem icon={<FileText className="w-4 h-4" />} label="설정 구멍_수정안" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.tags", "분류")}>
          <TreeItem icon={<FolderOpen className="w-4 h-4" />} label="세계관 설정" />
          <TreeItem icon={<FolderOpen className="w-4 h-4" />} label="캐릭터 구상" />
          <TreeItem icon={<Tag className="w-4 h-4" />} label="중요" />
        </SidebarTreeSection>
      </div>

      <div className="px-2 mt-4 space-y-1">
        <Button variant="ghost" className="w-full justify-start gap-2 h-8 px-2 text-primary hover:text-primary/90">
          <Plus className="w-4 h-4" /> 새 노트 작성
        </Button>
      </div>
    </div>
  );
}
