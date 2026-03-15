import { useDeferredValue, useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";
import type { WorldGraphNode } from "@shared/types";
import { buildEntityCatalogEntries } from "../utils/worldGraphIdeViewModels";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { useWorldGraphSelection } from "../scene/useWorldGraphSelection";

interface EntityMainViewProps {
  nodes?: WorldGraphNode[];
}

export function EntityMainView({ nodes = [] }: EntityMainViewProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { selectNode } = useWorldGraphSelection();
  const setActiveTab = useWorldGraphUiStore((state) => state.setActiveTab);

  const entries = useMemo(
    () => buildEntityCatalogEntries(nodes, deferredQuery),
    [deferredQuery, nodes],
  );

  const handleOpenNode = (nodeId: string) => {
    selectNode(nodeId);
    setActiveTab("graph");
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <header className="flex items-center justify-between border-b px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("world.graph.entity.title", "엔티티 사전")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            실제로 저장된 엔티티만 보여주며, 카드를 누르면 그래프 편집기로 바로 이동합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("world.graph.entity.searchPlaceholder", "엔티티 검색...")}
              className="bg-background pl-9"
            />
          </div>
          <Button className="gap-2" onClick={() => setActiveTab("graph")}>
            <Sparkles className="h-4 w-4" />
            {t("world.graph.entity.createInGraph", "그래프에서 새 블럭 만들기")}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        {entries.length === 0 ? (
          <div className="mx-auto max-w-3xl rounded-xl border border-dashed border-border/60 bg-card/40 px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {query.trim().length > 0
                ? t("world.graph.entity.emptySearch", "검색 결과가 없습니다")
                : t("world.graph.entity.empty", "아직 저장된 엔티티가 없습니다")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {query.trim().length > 0
                ? t("world.graph.entity.emptySearchHint", "검색어를 바꾸거나 다른 키워드로 찾아보세요.")
                : t("world.graph.entity.emptyHint", "그래프 탭에서 블럭을 만들고 타입을 지정하면 여기에 자동으로 들어옵니다.")}
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry) => {
              const iconKey = entry.subType ?? entry.entityType;
              const Icon =
                WORLD_GRAPH_ICON_MAP[iconKey] ?? WORLD_GRAPH_ICON_MAP.WorldEntity;
              const accent =
                WORLD_GRAPH_MINIMAP_COLORS[iconKey] ?? "#94a3b8";

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleOpenNode(entry.id)}
                  className="group flex flex-col justify-between rounded-xl border bg-card p-5 text-left shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60"
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{entry.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t(`world.graph.entityTypes.${entry.subType ?? entry.entityType}`, {
                          defaultValue: entry.subType ?? entry.entityType,
                        })}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                    {entry.description?.trim() ||
                      t("world.graph.entity.noDescription", "설명이 아직 없습니다. 그래프 편집기에서 채울 수 있습니다.")}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={`${entry.id}-${tag}`}
                        className="inline-flex items-center rounded-md bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
