import { Save, Bold, Italic, List, AlignLeft, StickyNote } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

const TOOLBAR_ITEMS = [
  { icon: Bold, label: "굵게" },
  { icon: Italic, label: "기울임" },
  { icon: List, label: "목록" },
  { icon: AlignLeft, label: "정렬" },
];

export function NoteMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <StickyNote className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("world.graph.note.title", "아이디어 노트")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              설정을 구상하다 떠오른 단편적인 생각들을 기록하세요.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2">
            <Save className="h-4 w-4" />
            저장
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-8 py-2">
        {TOOLBAR_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Button key={item.label} variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="sr-only">{item.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Editor Area (Textarea or Editor stub) */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-4xl px-8 py-8">
          <textarea
            className="min-h-[500px] w-full resize-none bg-transparent text-lg leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="새로운 아이디어를 입력하세요..."
            defaultValue={`마왕의 과거 떡밥

- 원래는 인간이었다는 설정 추가할 것
- 왕국력 123년 이전의 사건과 연관이 있음
- 주인공의 아버지와 안면이 있는 사이?`}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
