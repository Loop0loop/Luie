import {
  Users,
  Calendar,
  MapPin,
  Flag,
  BookOpen,
  Link,
  ArrowRight,
  Activity,
  Globe,
  CheckSquare,
  Layers,
  Target,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { SidebarTreeSection, TreeItem } from "./SidebarTreeSection";

export function GraphSidebarContent() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="space-y-1 mb-4">
        <SidebarTreeSection title={t("world.graph.ide.sidebar.entities", "요소 목록")}>
          <TreeItem icon={<Users className="w-4 h-4" />} label="인물" />
          <TreeItem icon={<Calendar className="w-4 h-4" />} label="사건" />
          <TreeItem icon={<MapPin className="w-4 h-4" />} label="장소" />
          <TreeItem icon={<Flag className="w-4 h-4" />} label="세력" />
          <TreeItem icon={<BookOpen className="w-4 h-4" />} label="설정" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.relations", "관계 구조")}>
          <TreeItem icon={<Link className="w-4 h-4" />} label="소속" />
          <TreeItem icon={<ArrowRight className="w-4 h-4" />} label="인과" />
          <TreeItem icon={<Activity className="w-4 h-4" />} label="영향" />
          <TreeItem icon={<Globe className="w-4 h-4" />} label="위치" />
        </SidebarTreeSection>

        <SidebarTreeSection title={t("world.graph.ide.sidebar.filters", "필터")}>
          <TreeItem icon={<CheckSquare className="w-4 h-4" />} label="인물 보기" isActive />
          <TreeItem icon={<CheckSquare className="w-4 h-4" />} label="사건 보기" isActive />
          <TreeItem icon={<CheckSquare className="w-4 h-4" />} label="장소 보기" isActive />
        </SidebarTreeSection>
      </div>

      <div className="px-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">정렬 도구</p>
        <div className="flex flex-col gap-1">
          <Button variant="ghost" className="justify-start gap-2 h-8 px-2 text-muted-foreground">
            <Layers className="w-4 h-4" /> 자동 정렬
          </Button>
          <Button variant="ghost" className="justify-start gap-2 h-8 px-2 text-muted-foreground">
            <Target className="w-4 h-4" /> 묶어서 보기
          </Button>
          <Button variant="ghost" className="justify-start gap-2 h-8 px-2 text-muted-foreground">
            <RotateCcw className="w-4 h-4" /> 초기화
          </Button>
        </div>
      </div>
    </div>
  );
}
