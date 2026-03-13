import { memo } from "react";
import { useWorldBuildingStore, useFilteredGraph } from "@renderer/features/research/stores/worldBuildingStore";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Separator } from "@renderer/components/ui/separator";
import { WORLD_GRAPH_ICON_MAP } from "@shared/constants/worldGraphUI";
import { useTranslation } from "react-i18next";
import { Trash2, ArrowRight } from "lucide-react";
import type { RelationKind } from "@shared/types";
import { RELATION_COLORS } from "@shared/constants/world";

export const EntityInspectorPanel = memo(() => {
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldBuildingStore((state) => state.selectedEdgeId);
  const { nodes, edges } = useFilteredGraph();
  const updateRelation = useWorldBuildingStore((state) => state.updateRelation);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);
  const { t } = useTranslation();
  
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  if (selectedEdge) {
    const sourceNode = nodes.find((n) => n.id === selectedEdge.sourceId);
    const targetNode = nodes.find((n) => n.id === selectedEdge.targetId);
    
    return (
      <div className="flex h-full w-full flex-col bg-panel border-l border-border/40 overflow-hidden">
        <div className="flex flex-col gap-3 p-4 shrink-0 bg-background/50 border-b border-border/40">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight size={16} />
            <span className="text-xs font-semibold tracking-wider uppercase opacity-80">Relationship</span>
          </div>
          <h2 className="text-lg font-bold text-foreground leading-tight tracking-tight break-keep flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">{sourceNode?.name ?? "Unknown"}</span>
            <ArrowRight size={14} className="text-muted-foreground/50" />
            <span>{targetNode?.name ?? "Unknown"}</span>
          </h2>
        </div>
        
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Type</span>
              <select
                className="w-full rounded-md border border-border/40 bg-background/50 p-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-accent"
                value={selectedEdge.relation}
                onChange={(e) => updateRelation({ id: selectedEdge.id, relation: e.target.value as RelationKind })}
              >
                {Object.keys(RELATION_COLORS).map((rel) => (
                  <option key={rel} value={rel}>
                    {t(`world.graph.relationTypes.${rel}`, rel)}
                  </option>
                ))}
              </select>
            </div>
            
            <Separator className="bg-border/40" />
            
            <button
              onClick={() => deleteRelation(selectedEdge.id)}
              className="flex items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 hover:text-destructive-hover"
            >
              <Trash2 size={16} />
              <span>관계 끊기</span>
            </button>
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (!selectedNode) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-panel/50 text-sm text-muted-foreground">
        <p>선택된 요소가 없습니다.</p>
      </div>
    );
  }

  const { name, description, entityType, subType } = selectedNode;
  const Icon = WORLD_GRAPH_ICON_MAP[subType ?? entityType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];

  return (
    <div className="flex h-full w-full flex-col bg-panel border-l border-border/40 overflow-hidden">
      <div className="flex flex-col gap-3 p-4 shrink-0 bg-background/50 border-b border-border/40">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon size={16} />
          <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{subType ?? entityType}</span>
        </div>
        <h2 className="text-xl font-bold text-foreground leading-tight tracking-tight break-keep">
          {name}
        </h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col gap-6">
          {description ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Description</span>
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{description}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Description</span>
              <p className="text-sm italic text-muted-foreground/60">설명이 없습니다.</p>
            </div>
          )}

          <Separator className="bg-border/40" />
          
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Metadata</span>
            <div className="rounded-md border border-border/40 bg-background/50 p-3 text-sm">
              <div className="grid grid-cols-[80px_1fr] items-center gap-2 text-muted-foreground">
                <span className="text-xs">타입</span>
                <span className="font-medium text-foreground">{entityType}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
});

EntityInspectorPanel.displayName = "EntityInspectorPanel";
