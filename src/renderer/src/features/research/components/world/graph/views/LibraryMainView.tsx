import { Search, FolderPlus, Upload, Image as ImageIcon, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

const MOCK_FILES = [
  { id: 1, type: "template", title: "Character Template", desc: "기본 인물 설정", icon: LayoutTemplate },
  { id: 2, type: "template", title: "Faction Template", desc: "세력/집단 설정", icon: LayoutTemplate },
  { id: 3, type: "image", title: "중세 의상 레퍼런스", desc: "1920x1080 • 1.2MB", icon: ImageIcon },
  { id: 4, type: "image", title: "고딕 건축 양식", desc: "1080x1080 • 800KB", icon: ImageIcon },
  { id: 5, type: "image", title: "양손검 형태 모음", desc: "2048x1080 • 2.1MB", icon: ImageIcon },
];

export function LibraryMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.library.title", "라이브러리")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            집필에 필요한 이미지 레퍼런스와 설정 템플릿을 관리하세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="자료 검색..." className="bg-background pl-9" />
          </div>
          <Button variant="outline" className="gap-2">
            <FolderPlus className="h-4 w-4" />
            새 폴더
          </Button>
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            업로드
          </Button>
        </div>
      </header>

      {/* Grid Content */}
      <ScrollArea className="flex-1 px-8 py-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {MOCK_FILES.map((file) => {
            const Icon = file.icon;
            return (
              <div 
                key={file.id} 
                className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex aspect-video w-full items-center justify-center bg-secondary/50 transition-colors group-hover:bg-secondary">
                  <Icon className="h-10 w-10 text-muted-foreground/50 transition-colors group-hover:text-primary/70" />
                </div>
                <div className="p-4">
                  <h3 className="truncate font-semibold leading-none">{file.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">{file.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
