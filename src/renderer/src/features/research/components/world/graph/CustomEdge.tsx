import { memo } from "react";
import { type EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer } from "reactflow";
import { useTranslation } from "react-i18next";
import { Trash2, ArrowRight } from "lucide-react";
import { useFilteredGraph, useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { RELATION_COLORS } from "@shared/constants/world";
import type { RelationKind } from "@shared/types";

export const CustomEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  selected,
  source,
  target,
}: EdgeProps) => {
  const { t } = useTranslation();
  const { edges, nodes } = useFilteredGraph();
  const updateRelation = useWorldBuildingStore((state) => state.updateRelation);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const selectedEdge = edges.find((e) => e.id === id);
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      
      {label && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded-md pointer-events-none text-[10px] font-semibold"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              color: (labelStyle?.fill as string) ?? "inherit",
              backgroundColor: (labelBgStyle?.fill as string) ?? "var(--bg-app)",
              padding: labelBgPadding ? `${labelBgPadding[0]}px ${labelBgPadding[1]}px` : "4px 6px",
              opacity: selected ? 0 : 0.85, // Hide label when selected to show popover
              zIndex: 10,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}

      {selected && selectedEdge && (
        <EdgeLabelRenderer>
          <div
            className="absolute z-50 flex w-72 flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-xl !animate-in !fade-in !zoom-in-95 data-[state=closed]:!animate-out data-[state=closed]:!fade-out data-[state=closed]:!zoom-out-95 pointer-events-auto"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 15}px)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex flex-col gap-2 p-3 border-b border-border/40 bg-muted/50 rounded-t-xl">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-widest">
                <ArrowRight size={14} />
                <span>Relationship</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold break-keep flex-wrap">
                <span className="text-muted-foreground">{sourceNode?.name ?? "Unknown"}</span>
                <ArrowRight size={14} className="text-muted-foreground/50 shrink-0" />
                <span>{targetNode?.name ?? "Unknown"}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 p-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Type</label>
                <select
                  className="w-full rounded-md border border-border bg-background p-2 text-sm outline-none focus:ring-1 focus:ring-accent transition-shadow"
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
              
              <button
                onClick={() => {
                  deleteRelation(selectedEdge.id);
                  selectEdge(null);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20 active:scale-95"
              >
                <Trash2 size={16} />
                <span>관계 끊기</span>
              </button>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

CustomEdge.displayName = "CustomEdge";
