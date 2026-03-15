import { memo, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { type EdgeProps, getBezierPath, BaseEdge, EdgeLabelRenderer } from "reactflow";
import { useTranslation } from "react-i18next";
import { Trash2, ArrowRight, ArrowLeftRight, Minus, Palette, Edit2 } from "lucide-react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { RELATION_COLORS } from "@shared/constants/world";
import type { RelationKind } from "@shared/types";
import { cn } from "@renderer/lib/utils";
import { useWorldGraphScene } from "../scene/useWorldGraphScene";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";

const EDGE_COLORS = [
  "#94a3b8", // slaty
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#a855f7", // purple
  "#ec4899", // pink
];

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
  selected,
}: EdgeProps) => {
  const { t } = useTranslation();
  const scene = useWorldGraphScene();
  const updateRelation = useWorldBuildingStore((state) => state.updateRelation);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);
  const selectEdge = useWorldGraphUiStore((state) => state.selectEdge);
  const selectedEdgeId = useWorldGraphUiStore((state) => state.selectedEdgeId);
  const isSelected = selected || selectedEdgeId === id;

  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const selectedEdge = scene.edgeById.get(id);
  const attributes = useMemo(
    () => (selectedEdge?.attributes as Record<string, unknown>) || {},
    [selectedEdge?.attributes],
  );
  const direction = (attributes?.direction as string) || "unidirectional";
  
  const customColor = (attributes?.color as string) || RELATION_COLORS[selectedEdge?.relation as RelationKind] || "#94a3b8";
  
  // If user typed a custom label, use it. Otherwise, use default rel enum translation
  const rawLabelStr = typeof label === "string" ? label : "";
  const labelText = (attributes?.label as string) || rawLabelStr || (selectedEdge ? t(`world.graph.relationTypes.${selectedEdge.relation}`, { defaultValue: selectedEdge.relation }) : "");

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
    strokeWidth: isSelected ? 3 : 2,
    opacity: 1, // disabled dimming for unselected
    transition: 'all 0.2s ease',
  };

  const onStartEditing = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditValue(labelText);
    selectEdge(id);
    setIsEditing(true);
    setIsColorPickerOpen(false);
  }, [labelText, id, selectEdge]);

  const onSaveEdit = useCallback(() => {
    setIsEditing(false);
    if (editValue.trim() !== "") {
      handleUpdateAttribute("label", editValue.trim());
    } else {
      handleUpdateAttribute("label", "");
    }
  }, [editValue, handleUpdateAttribute]);

  const onEdgeDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onStartEditing(e);
  }, [onStartEditing]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Allow clicks in the text input while editing
      if (isEditing) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    if (isColorPickerOpen || isSelected) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isColorPickerOpen, isSelected, isEditing]);

  // Auto focus input
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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
        strokeWidth={24}
        className="react-flow__edge-interaction cursor-pointer"
        onDoubleClick={onEdgeDoubleClick}
        onClick={(e) => { e.stopPropagation(); selectEdge(id); setIsColorPickerOpen(false); }}
      />
      
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto flex justify-center items-center"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            zIndex: isSelected ? 50 : 10,
          }}
          onDoubleClick={onEdgeDoubleClick}
          onClick={(e) => { 
            if (!isEditing) {
              e.stopPropagation(); 
              selectEdge(id); 
              setIsColorPickerOpen(false);
            }
          }}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") {
                  setIsEditing(false);
                  setEditValue(labelText);
                }
              }}
              onBlur={onSaveEdit}
              className="px-2 py-1 text-[11px] font-bold text-center rounded-lg border-2 border-accent bg-background shadow-md outline-none min-w-[80px] max-w-[200px]"
              style={{ color: customColor }}
            />
          ) : (
            <div
              className={cn(
                "rounded-md text-[10px] font-semibold transition-all px-2 py-1 shadow-sm border cursor-pointer max-w-[150px] text-center wrap-break-word",
                isSelected ? "ring-2 ring-accent/40 shadow-md border-border/50 bg-background/95" : "border-transparent bg-[var(--bg-app)]/80 hover:bg-background"
              )}
              style={{
                color: customColor,
              }}
            >
              {labelText}
            </div>
          )}
        </div>

        {isSelected && selectedEdge && !isEditing && (
          <div
            className="absolute z-50 flex items-center justify-center gap-1 rounded-full border border-border/60 bg-popover/95 p-1.5 text-popover-foreground shadow-xl backdrop-blur-md animate-in! !fade-in !zoom-in-95 pointer-events-auto"
            style={{
              transform: `translate(-50%, 0) translate(${labelX}px, ${labelY + 15}px)`,
            }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            ref={dropdownRef}
          >
            {/* Color Picker Toggle */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsColorPickerOpen(!isColorPickerOpen);
                }}
                className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent/80 hover:text-accent-foreground transition-all group"
                title="색상 변경 (Color)"
              >
                <Palette size={14} strokeWidth={2.5} style={{ color: customColor }} />
              </button>

              {isColorPickerOpen && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-2 z-[100] grid grid-cols-5 gap-1.5 min-w-[120px] animate-in slide-in-from-top-2">
                  {EDGE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateAttribute("color", color);
                        setIsColorPickerOpen(false);
                      }}
                      className={cn(
                        "w-5 h-5 rounded-full border border-border/50 shadow-sm transition-transform hover:scale-110",
                        customColor === color && "ring-2 ring-foreground scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            {/* Direction Toggle */}
            <button
              onClick={cycleDirection}
              className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent/80 hover:text-accent-foreground transition-all text-muted-foreground"
              title="결합 방향 (Direction)"
            >
              {direction === "unidirectional" && <ArrowRight size={14} strokeWidth={2.5} />}
              {direction === "bidirectional" && <ArrowLeftRight size={14} strokeWidth={2.5} />}
              {direction === "nondirectional" && <Minus size={14} strokeWidth={2.5} />}
            </button>

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            {/* Edit Label Toggle */}
            <button
              onClick={onStartEditing}
              className="flex items-center justify-center p-1.5 rounded-full hover:bg-accent/80 hover:text-accent-foreground transition-all text-muted-foreground"
              title="관계명 수정 (Edit)"
            >
              <Edit2 size={14} strokeWidth={2.5} />
            </button>

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteRelation(selectedEdge.id);
                selectEdge(null);
              }}
              className="flex items-center justify-center p-1.5 rounded-full hover:bg-destructive/10 text-destructive/80 hover:text-destructive transition-all"
              title="관계 삭제 (Delete)"
            >
              <Trash2 size={14} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
});

CustomEdge.displayName = "CustomEdge";
