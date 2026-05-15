import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReactFlow } from "reactflow";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/utils";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { CANVAS_NODE_ICON } from "../stage/nodes/nodeConstants";
import { ENTITY_TYPE_TO_CANVAS_KIND } from "../types";
import type { CanvasNodeKind } from "../types";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { SidePanelHeader } from "./SidePanelHeader";

interface OutlinePanelProps {
  graphNodes: readonly WorldGraphNode[];
}

interface OutlineGroup {
  kind: CanvasNodeKind;
  labelKey: string;
  nodes: WorldGraphNode[];
}

const GROUP_LABEL_KEYS: Record<CanvasNodeKind, string> = {
  episode: "canvas.sidebar.outline.groups.episodes",
  character: "canvas.sidebar.outline.groups.characters",
  event: "canvas.sidebar.outline.groups.events",
  place: "canvas.sidebar.outline.groups.places",
  note: "canvas.sidebar.outline.groups.notes",
};

const GROUP_ORDER: readonly CanvasNodeKind[] = [
  "episode",
  "character",
  "event",
  "place",
  "note",
];

function groupNodesByKind(
  nodes: readonly WorldGraphNode[],
): OutlineGroup[] {
  const map = new Map<CanvasNodeKind, WorldGraphNode[]>();
  for (const node of nodes) {
    const kind = ENTITY_TYPE_TO_CANVAS_KIND[node.entityType];
    const list = map.get(kind);
    if (list) list.push(node);
    else map.set(kind, [node]);
  }
  return GROUP_ORDER.flatMap<OutlineGroup>((kind) => {
    const group = map.get(kind);
    if (!group || group.length === 0) return [];
    group.sort((a, b) => a.name.localeCompare(b.name));
    return [{ kind, labelKey: GROUP_LABEL_KEYS[kind], nodes: group }];
  });
}

/**
 * Outline Activity의 SidePanel.
 *
 * 종류별로 묶은 캔버스 노드 트리. Editor `Sidebar.tsx`의 Chapter row 패턴을
 * 인용해 active 항목은 `bg-active text-fg` + 좌측 `border-l-[3px] border-accent`로
 * 표시. 클릭하면 캔버스 카메라가 해당 노드로 이동.
 */
export function OutlinePanel({ graphNodes }: OutlinePanelProps) {
  const { t } = useTranslation();
  const selectNode = useCanvasUiStore((s) => s.selectNode);
  const selection = useCanvasUiStore((s) => s.selection);
  const reactFlow = useReactFlow();

  const groups = useMemo(() => groupNodesByKind(graphNodes), [graphNodes]);
  const selectedId = selection.kind === "node" ? selection.id : null;

  // 그룹별 펼침 상태 — 기본 모두 펼침. 그룹 헤더 클릭으로 토글.
  const [collapsed, setCollapsed] = useState<Record<CanvasNodeKind, boolean>>(
    {} as Record<CanvasNodeKind, boolean>,
  );

  const handleNodeClick = (node: WorldGraphNode) => {
    selectNode(node.id);
    reactFlow.setCenter(node.positionX, node.positionY, {
      zoom: 1,
      duration: 300,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SidePanelHeader title={t(CANVAS_SECTION_KEYS.outline)} />
      <ScrollArea className="min-h-0 flex-1">
        {groups.length === 0 ? (
          <p className="px-3 py-2 text-[12px] leading-relaxed text-muted">
            {t("canvas.sidebar.outline.empty")}
          </p>
        ) : (
          <ul className="flex flex-col pb-2">
            {groups.map((group) => {
              const Icon = CANVAS_NODE_ICON[group.kind];
              const isCollapsed = !!collapsed[group.kind];
              return (
                <li key={group.kind} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [group.kind]: !prev[group.kind],
                      }))
                    }
                    aria-expanded={!isCollapsed}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-3 py-1",
                      "text-[11px] font-semibold uppercase tracking-wider text-muted",
                      "transition-colors hover:text-fg",
                    )}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="size-3 shrink-0 opacity-70" />
                    ) : (
                      <ChevronDown className="size-3 shrink-0 opacity-70" />
                    )}
                    <Icon className="size-3 shrink-0 opacity-60" />
                    <span className="flex-1 text-left">
                      {t(group.labelKey)}
                    </span>
                    <span className="tabular-nums opacity-60">
                      {group.nodes.length}
                    </span>
                  </button>
                  {!isCollapsed ? (
                    <ul className="flex flex-col">
                      {group.nodes.map((node) => {
                        const active = node.id === selectedId;
                        return (
                          <li key={node.id}>
                            <button
                              type="button"
                              onClick={() => handleNodeClick(node)}
                              className={cn(
                                "flex w-full items-center gap-2 py-1 pr-3 pl-9 text-left text-[13px] transition-all",
                                active
                                  ? "border-l-[3px] border-accent bg-active font-medium text-fg"
                                  : "border-l-2 border-transparent text-muted hover:bg-surface-hover hover:text-fg",
                              )}
                            >
                              <span className="truncate">{node.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
