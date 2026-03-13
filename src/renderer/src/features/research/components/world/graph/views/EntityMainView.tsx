import { Search, Plus, MapPin, Users, MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";

const MOCK_ENTITIES = [
  { id: 1, name: "아르웬", type: "Character", tags: ["주연", "전사"], updatedAt: "2026-03-12" },
  { id: 2, name: "리아", type: "Character", tags: ["주연", "마법사"], updatedAt: "2026-03-11" },
  { id: 3, name: "마왕", type: "Character", tags: ["반동인물", "보스"], updatedAt: "2026-03-10" },
  { id: 4, name: "왕도", type: "Place", tags: ["수도", "시작점"], updatedAt: "2026-03-09" },
  { id: 5, name: "안개 계곡", type: "Place", tags: ["격전지"], updatedAt: "2026-03-09" },
];

export function EntityMainView() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.entity.title", "엔티티 사전")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등장인물, 장소 등 작품의 설정 요소들을 모아봅니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="text" placeholder="엔티티 검색..." className="bg-background pl-9" />
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            새 엔티티
          </Button>
        </div>
      </header>

      {/* Grid Content */}
      <ScrollArea className="flex-1 px-8 py-8">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_ENTITIES.map((entity) => {
            const isCharacter = entity.type === "Character";
            return (
              <div 
                key={entity.id}
                className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                      {isCharacter ? <Users className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                    </div>
                    <div>
                      <h3 className="font-semibold">{entity.name}</h3>
                      <p className="text-xs text-muted-foreground">{entity.updatedAt}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {entity.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center rounded-md bg-secondary/50 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
