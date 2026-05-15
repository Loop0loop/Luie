import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useReactFlow } from "reactflow";
import { Search } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Input } from "@renderer/components/ui/input";
import { cn } from "@renderer/lib/utils";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { CANVAS_NODE_ICON } from "../stage/nodes/nodeConstants";
import { ENTITY_TYPE_TO_CANVAS_KIND } from "../types";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { SidePanelHeader } from "./SidePanelHeader";

interface SearchPanelProps {
  graphNodes: readonly WorldGraphNode[];
}

const MAX_RESULTS = 30;

/**
 * Search Activity의 SidePanel.
 *
 * 현재 그래프의 노드 이름을 부분 일치로 검색. 셸 단계에서는 노드만
 * 다루고, 관계/원고 검색은 Memory 파이프라인이 들어오면 확장.
 *
 * row 스타일은 Editor `Sidebar.tsx`의 chapter row와 동일한 height/padding/
 * hover 톤을 사용해 통일감을 유지.
 */
export function SearchPanel({ graphNodes }: SearchPanelProps) {
  const { t } = useTranslation();
  const query = useCanvasUiStore((s) => s.searchQuery);
  const setQuery = useCanvasUiStore((s) => s.setSearchQuery);
  const selectNode = useCanvasUiStore((s) => s.selectNode);
  const reactFlow = useReactFlow();

  const trimmed = query.trim().toLocaleLowerCase();

  const results = useMemo<readonly WorldGraphNode[]>(() => {
    if (trimmed.length === 0) return [];
    return graphNodes
      .filter((node) => node.name.toLocaleLowerCase().includes(trimmed))
      .slice(0, MAX_RESULTS);
  }, [graphNodes, trimmed]);

  const handleSelect = (node: WorldGraphNode) => {
    selectNode(node.id);
    reactFlow.setCenter(node.positionX, node.positionY, {
      zoom: 1,
      duration: 300,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader title={t(CANVAS_SECTION_KEYS.search)} />

      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("canvas.sidebar.search.placeholder")}
            className="h-7 rounded-md border-border bg-surface pl-7 text-[12px] placeholder:text-muted/70 focus-visible:border-accent/50 focus-visible:ring-0"
          />
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {trimmed.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-muted">
            {t("canvas.sidebar.search.empty")}
          </p>
        ) : results.length === 0 ? (
          <p className="px-3 py-2 text-[12px] text-muted">
            {t("canvas.sidebar.search.noResults")}
          </p>
        ) : (
          <ul className="flex flex-col pb-2">
            {results.map((node) => {
              const kind = ENTITY_TYPE_TO_CANVAS_KIND[node.entityType];
              const Icon = CANVAS_NODE_ICON[kind];
              return (
                <li key={node.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(node)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-all",
                      "border-l-2 border-transparent text-muted hover:bg-surface-hover hover:text-fg",
                    )}
                  >
                    <Icon className="size-3 shrink-0 opacity-60" />
                    <span className="truncate">{node.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
