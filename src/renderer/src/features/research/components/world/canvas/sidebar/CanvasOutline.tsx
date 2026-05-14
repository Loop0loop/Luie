import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useReactFlow } from "reactflow";
import type { WorldGraphNode } from "@shared/types";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/utils";
import { CANVAS_SECTION_KEYS } from "../shared/constants";
import { CANVAS_NODE_ICON, CANVAS_NODE_TINT } from "../stage/nodes/nodeConstants";
import { ENTITY_TYPE_TO_CANVAS_KIND } from "../types";
import type { CanvasNodeKind } from "../types";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { SidebarSection } from "./SidebarSection";

interface CanvasOutlineProps {
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

/**
 * 노드를 종류별로 묶어 정렬된 OutlineGroup 배열로 변환.
 * 각 그룹은 이름순 정렬.
 */
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
    const groupNodes = map.get(kind);
    if (!groupNodes || groupNodes.length === 0) return [];
    groupNodes.sort((a, b) => a.name.localeCompare(b.name));
    return [{ kind, labelKey: GROUP_LABEL_KEYS[kind], nodes: groupNodes }];
  });
}

/**
 * Outline: 현재 Scope 안에 들어 있는 노드를 종류별로 표시.
 *
 * 클릭하면:
 *   1. canvasUiStore.selection을 해당 노드로 설정 (BinderBar Inspector 갱신)
 *   2. react-flow가 해당 노드로 카메라 이동 (setCenter)
 */
export function CanvasOutline({ graphNodes }: CanvasOutlineProps) {
  const { t } = useTranslation();
  const selectNode = useCanvasUiStore((s) => s.selectNode);
  const selection = useCanvasUiStore((s) => s.selection);
  const reactFlow = useReactFlow();

  const groups = useMemo(() => groupNodesByKind(graphNodes), [graphNodes]);
  const selectedId = selection.kind === "node" ? selection.id : null;

  const handleNodeClick = (node: WorldGraphNode) => {
    selectNode(node.id);
    reactFlow.setCenter(node.positionX, node.positionY, {
      zoom: 1,
      duration: 300,
    });
  };

  return (
    <SidebarSection title={t(CANVAS_SECTION_KEYS.outline)} fill collapsible>
      <ScrollArea className="min-h-0 flex-1">
        {groups.length === 0 ? (
          <p className="py-2 text-[12px] leading-relaxed text-muted-foreground/70">
            {t("canvas.sidebar.outline.empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 pb-2">
            {groups.map((group) => {
              const Icon = CANVAS_NODE_ICON[group.kind];
              const tint = CANVAS_NODE_TINT[group.kind];
              return (
                <li key={group.kind} className="flex flex-col">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-3" style={{ color: tint }} />
                    <span>{t(group.labelKey)}</span>
                    <span className="ml-auto text-muted-foreground/60">
                      {group.nodes.length}
                    </span>
                  </div>
                  <ul className="flex flex-col">
                    {group.nodes.map((node) => {
                      const active = node.id === selectedId;
                      return (
                        <li key={node.id}>
                          <button
                            type="button"
                            onClick={() => handleNodeClick(node)}
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[12px] leading-tight transition-colors",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                            )}
                          >
                            <span className="truncate">{node.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </SidebarSection>
  );
}
