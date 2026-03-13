import { memo, useState, useCallback, useRef, useEffect } from "react";
import { type EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer } from "reactflow";
import { useTranslation } from "react-i18next";
import { Trash2, ArrowRight, ArrowLeftRight, Minus } from "lucide-react";
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
}: EdgeProps) => {
  const { t } = useTranslation();
  const { edges } = useFilteredGraph();
  const updateRelation = useWorldBuildingStore((state) => state.updateRelation);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);

  const [isRelationPickerOpen, setIsRelationPickerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const selectedEdge = edges.find((e) => e.id === id);
  const attributes = (selectedEdge?.attributes as Record<string, unknown>) || {};
  const direction = (attributes?.direction as string) || "unidirectional";
  
  // Use custom color or fallback to relation default color
  const customColor = (attributes?.color as string) || RELATION_COLORS[selectedEdge?.relation as RelationKind] || "#c7d2fe";

  const handleUpdateAttribute = useCallback((key: string, value: string) => {
    if (!selectedEdge) return;
    updateRelation({
      id: selectedEdge.id,
      attributes: {
        ...attributes,
        [key]: value
      }
    });
  }, [selectedEdge, attributes, updateRelation]);

  const cycleDirection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDir = direction === "unidirectional" ? "bidirectional" : 
                    direction === "bidirectional" ? "nondirectional" : "unidirectional";
    handleUpdateAttribute("direction", nextDir);
  }, [direction, handleUpdateAttribute]);

  // Adjust marker based on direction
  const isBidirectional = direction === "bidirectional";
  const isUnidirectional = direction === "unidirectional";
  const resolvedMarkerEnd = isUnidirectional || isBidirectional ? markerEnd : undefined;
  const resolvedMarkerStart = isBidirectional ? markerEnd : undefined;

  const edgeStyle = {
    ...style,
    stroke: customColor,
    strokeWidth: selected ? 3 : 2,
    opacity: selected ? 1 : 0.7,
    transition: 'all 0.2s ease',
  };

  const onEdgeDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRelationPickerOpen(true);
    // Auto select on double click to show the toolbar as well
    selectEdge(id);
  }, [id, selectEdge]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRelationPickerOpen(false);
      }
    };
    if (isRelationPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isRelationPickerOpen]);

  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        style={edgeStyle} 
        markerEnd={resolvedMarkerEnd} 
        markerStart={resolvedMarkerStart} 
      />
      
      {/* Invisible thicker area for double click and easy selection */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
        onDoubleClick={onEdgeDoubleClick}
      />
      
      {label && !selected && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded-md pointer-events-none text-[10px] font-semibold transition-opacity"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              color: (labelStyle?.fill as string) ?? "inherit",
              backgroundColor: (labelBgStyle?.fill as string) ?? "var(--bg-app)",
              padding: labelBgPadding ? `${labelBgPadding[0]}px ${labelBgPadding[1]}px` : "4px 6px",
              opacity: 0.85,
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
            className="absolute z-50 flex items-center justify-center gap-1 rounded-full border border-border/60 bg-popover/90 p-1.5 text-popover-foreground shadow-xl backdrop-blur-md !animate-in !fade-in !zoom-in-95 data-[state=closed]:!animate-out data-[state=closed]:!fade-out data-[state=closed]:!zoom-out-95 pointer-events-auto transition-all"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 15}px)`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              // Keep showing when clicked inside
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            ref={dropdownRef}
          >
            {/* Color/Relation Picker Toggle */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRelationPickerOpen(!isRelationPickerOpen);
                }}
                className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent/80 hover:text-accent-foreground transition-all group"
                title="관계 및 색상 변경"
              >
                <div className="w-4 h-4 rounded-full shadow-sm border border-border/50 ring-1 ring-background" style={{ backgroundColor: customColor }} />
              </button>

              {isRelationPickerOpen && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-1.5 z-[100] flex flex-col gap-1 min-w-[140px] animate-in slide-in-from-top-2">
                  <span className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">관계 변경</span>
                  <div className="flex flex-col max-h-48 overflow-y-auto w-full no-scrollbar pb-1">
                    {Object.entries(RELATION_COLORS).map(([rel, color]) => (
                      <button
                        key={rel}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateRelation({ id: selectedEdge.id, relation: rel as RelationKind, attributes: { ...attributes, color } });
                          setIsRelationPickerOpen(false);
                        }}
                        className={`flex items-center gap-2.5 text-xs px-2.5 py-2 text-left rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors ${selectedEdge.relation === rel ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}
                      >
                         <div className="w-3 h-3 rounded-full border border-border/50 shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                         <span className="truncate font-medium">{t(`world.graph.relationTypes.${rel}`, rel)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-border/60 mx-1" />

            {/* Direction Toggle */}
            <button
              onClick={cycleDirection}
              className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent/80 hover:text-accent-foreground transition-all text-muted-foreground"
              title="선 방향 변경"
            >
              {direction === "unidirectional" && <ArrowRight size={16} strokeWidth={2.5} />}
              {direction === "bidirectional" && <ArrowLeftRight size={16} strokeWidth={2.5} />}
              {direction === "nondirectional" && <Minus size={16} strokeWidth={2.5} />}
            </button>

            <div className="w-px h-4 bg-border/60 mx-1" />

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteRelation(selectedEdge.id);
                selectEdge(null);
              }}
              className="flex items-center justify-center p-1.5 rounded-full hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-all"
              title="관계 삭제"
            >
              <Trash2 size={16} strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

CustomEdge.displayName = "CustomEdge";
