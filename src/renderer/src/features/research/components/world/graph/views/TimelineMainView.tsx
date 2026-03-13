import { useTranslation } from "react-i18next";
import { Plus, Search, CalendarDays } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import type { EntityRelation, WorldGraphNode } from "@shared/types";

const MOCK_EVENTS = [
  { id: 1, date: "신화 시대", title: "태초의 전쟁", desc: "마왕이 처음으로 세상에 강림한 사건" },
  { id: 2, date: "왕국력 123년", title: "제 1차 방어선 붕괴", desc: "북부 산맥에서 마수 군단 돌파" },
  { id: 3, date: "왕국력 125년", title: "아르웬의 귀환", desc: "주인공이 검을 뽑고 왕도로 돌아옴" },
  { id: 4, date: "왕국력 125년 12월", title: "붉은 밤", desc: "왕도가 불길에 휩싸인 날" },
];

interface TimelineMainViewProps {
  nodes?: WorldGraphNode[];
  edges?: EntityRelation[];
}

export function TimelineMainView(_props: TimelineMainViewProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* Header 영역 - 작가들이 직관적으로 볼 수 있게 심플하게 구성 */}
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.timeline.title", "스토리 타임라인")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            작품 속 주요 사건들을 시간의 흐름에 따라 한눈에 파악하세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="사건 검색..." className="bg-background pl-9" />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            새 사건 추가
          </Button>
        </div>
      </header>

      {/* Timeline List 영역 - 복잡한 장식 제거하고 깔끔한 Notion 스타일 기반 */}
      <ScrollArea className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="relative border-l-2 border-muted pl-8 md:pl-0 md:border-l-0">
            {MOCK_EVENTS.map((event) => (
              <div key={event.id} className="group relative mb-8 flex flex-col md:flex-row md:items-start md:gap-8">
                {/* Timeline Dot (Desktop) */}
                <div className="hidden md:flex absolute left-[142px] mt-1.5 h-4 w-4 items-center justify-center rounded-full border-4 border-background bg-primary shadow-sm" />
                
                {/* Date / Label */}
                <div className="mb-2 md:mb-0 md:w-[130px] md:shrink-0 md:text-right md:pt-1">
                  <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                    <CalendarDays className="mr-1.5 h-3 w-3" />
                    {event.date}
                  </span>
                </div>

                {/* Event Card (shadcn/ui 기반 심플화) */}
                <div className="md:relative md:w-full md:border-l-2 md:border-muted md:pl-8 md:pb-8">
                  <div className="rounded-lg border bg-card text-card-foreground shadow-sm transition-colors hover:bg-accent/5">
                    <div className="flex flex-col space-y-1.5 p-5">
                      <h3 className="font-semibold leading-none tracking-tight">{event.title}</h3>
                    </div>
                    <div className="p-5 pt-0 text-sm text-muted-foreground">
                      {event.desc}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
