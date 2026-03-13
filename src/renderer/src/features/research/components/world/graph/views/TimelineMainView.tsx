import { useDeferredValue, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Plus, Search } from "lucide-react";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import { syncGraphEntitySelectionToWorkspace } from "../utils/graphEntitySync";
import { buildTimelineEntries } from "../utils/worldGraphIdeViewModels";

interface TimelineMainViewProps {
  nodes?: WorldGraphNode[];
  edges?: EntityRelation[];
}

export function TimelineMainView({ nodes = [] }: TimelineMainViewProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const createGraphNode = useWorldBuildingStore((state) => state.createGraphNode);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const setActiveTab = useGraphIdeStore((state) => state.setActiveTab);
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node] as const)),
    [nodes],
  );

  const entries = useMemo(
    () => buildTimelineEntries(nodes, deferredQuery),
    [deferredQuery, nodes],
  );

  const handleCreateEvent = async () => {
    if (!activeProjectId) return;
    const created = await createGraphNode({
      projectId: activeProjectId,
      entityType: "Event",
      name: t("world.graph.timeline.newEvent", "새 사건"),
      positionX: 120,
      positionY: 120,
    });

    if (!created) {
      return;
    }

    selectNode(created.id);
    setActiveTab("graph");
  };

  const handleOpenEvent = (nodeId: string) => {
    selectNode(nodeId);
    const node = nodeById.get(nodeId);
    if (node) {
      syncGraphEntitySelectionToWorkspace(node);
    }
    setActiveTab("graph");
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.timeline.title", "스토리 타임라인")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            저장된 사건 노드를 실제 시간축으로 정리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("world.graph.timeline.searchPlaceholder", "사건 검색...")}
              className="bg-background pl-9"
            />
          </div>
          <Button className="gap-2" onClick={() => void handleCreateEvent()}>
            <Plus className="h-4 w-4" />
            {t("world.graph.timeline.createEvent", "새 사건")}
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 px-8 py-8">
        <div className="mx-auto max-w-3xl">
          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                {query.trim().length > 0
                  ? t("world.graph.timeline.emptySearch", "검색 결과가 없습니다")
                  : t("world.graph.timeline.empty", "아직 저장된 사건이 없습니다")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {query.trim().length > 0
                  ? t("world.graph.timeline.emptySearchHint", "검색어를 바꾸거나 사건 이름을 다시 확인하세요.")
                  : t("world.graph.timeline.emptyHint", "그래프에서 사건 블럭을 만들면 이 타임라인에 바로 반영됩니다.")}
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-muted pl-8 md:border-l-0 md:pl-0">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleOpenEvent(entry.id)}
                  className="group relative mb-8 flex w-full flex-col text-left md:flex-row md:items-start md:gap-8"
                >
                  <div className="absolute left-[142px] mt-1.5 hidden h-4 w-4 rounded-full border-4 border-background bg-primary shadow-sm md:flex" />

                  <div className="mb-2 md:mb-0 md:w-[130px] md:shrink-0 md:pt-1 md:text-right">
                    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                      <CalendarDays className="mr-1.5 h-3 w-3" />
                      {entry.dateLabel}
                    </span>
                  </div>

                  <div className="md:relative md:w-full md:border-l-2 md:border-muted md:pb-8 md:pl-8">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm transition-colors group-hover:border-accent/40 group-hover:bg-accent/5">
                      <div className="flex flex-col space-y-1.5 p-5">
                        <h3 className="font-semibold leading-none tracking-tight">
                          {entry.title}
                        </h3>
                      </div>
                      <div className="p-5 pt-0 text-sm text-muted-foreground">
                        {entry.description?.trim() ||
                          t(
                            "world.graph.timeline.noDescription",
                            "아직 설명이 없습니다. 그래프에서 사건을 선택해 내용을 채울 수 있습니다.",
                          )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
