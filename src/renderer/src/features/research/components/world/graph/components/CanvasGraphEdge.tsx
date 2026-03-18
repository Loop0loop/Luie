import { memo } from "react";
import {
  ArrowRightLeft,
  Edit2,
  Maximize2,
  Palette,
  Trash2,
  Type,
} from "lucide-react";
import type { EdgeProps } from "reactflow";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";
import { Button } from "@renderer/components/ui/button";

export type CanvasGraphEdgeData = {
  palette: {
    stroke: string;
    selectedStroke: string;
    glow: string;
  };
  onDelete?: (id: string) => void;
  onChangeColor?: (id: string) => void;
  onChangeDirection?: (id: string) => void;
  onEditRelation?: (id: string) => void;
  onEdit?: (id: string) => void;
  onZoom?: (id: string) => void;
};

function CanvasGraphEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
  label,
}: EdgeProps<CanvasGraphEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.4,
  });

  const palette = data?.palette ?? {
    stroke: "rgba(255,255,255,0.22)",
    selectedStroke: "rgba(255,255,255,0.95)",
    glow: "rgba(255,255,255,0.18)",
  };

  const strokeColor = selected ? palette.selectedStroke : palette.stroke;
  const strokeWidth = selected ? 2.5 : 1.5;
  const dropShadow = selected ? `drop-shadow(0 0 8px ${palette.glow})` : "none";

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          filter: dropShadow,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            zIndex: selected ? 100 : 10,
          }}
          className="nodrag nopan flex flex-col items-center gap-1.5"
        >
          {selected && (
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#11151c]/95 p-1 shadow-xl backdrop-blur-md transition-all">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  data?.onDelete?.(id);
                }}
                title="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                onClick={(e) => {
                  e.stopPropagation();
                  data?.onZoom?.(id);
                }}
                title="확대"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              {data?.onChangeColor ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onChangeColor?.(id);
                  }}
                  title="색 변경"
                >
                  <Palette className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {data?.onChangeDirection ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onChangeDirection?.(id);
                  }}
                  title="선 방향"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {data?.onEditRelation ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEditRelation?.(id);
                  }}
                  title="관계 편집"
                >
                  <Type className="h-3.5 w-3.5" />
                </Button>
              ) : null}
              {data?.onEdit ? (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEdit?.(id);
                  }}
                  title="수정"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          )}
          {label && (
            <div
              className="rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide"
              style={{
                backgroundColor: "rgba(11,14,19,0.92)",
                borderColor: strokeColor,
                color: selected
                  ? "rgba(255,255,255,0.92)"
                  : "rgba(255,255,255,0.6)",
              }}
            >
              {label}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CanvasGraphEdge = memo(CanvasGraphEdgeInner);
