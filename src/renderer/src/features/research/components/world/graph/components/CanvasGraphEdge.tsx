import { memo, useState } from "react";
import {
  ArrowRightLeft,
  ArrowRight,
  Minus,
  Edit2,
  Maximize2,
  Palette,
  Trash2,
  Type,
} from "lucide-react";
import type { EdgeProps } from "reactflow";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";
import { Button } from "@renderer/components/ui/button";
import { CANVAS_EDGE_COLORS } from "../views/CanvasView";

export type CanvasGraphEdgeData = {
  palette: {
    stroke: string;
    selectedStroke: string;
    glow: string;
  };
  onDelete?: (id: string) => void;
  onChangeColor?: (id: string, color: string) => void;
  onChangeDirection?: (
    id: string,
    direction: "unidirectional" | "bidirectional" | "none",
  ) => void;
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
  const [showPalette, setShowPalette] = useState(false);
  const [showDirection, setShowDirection] = useState(false);
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
                <div className="relative flex items-center">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPalette((p) => !p);
                      setShowDirection(false);
                    }}
                    title="색 변경"
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                  {showPalette && (
                    <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#11151c]/95 p-1.5 shadow-xl backdrop-blur-md">
                      {CANVAS_EDGE_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="h-5 w-5 rounded-full hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            data.onChangeColor?.(id, color);
                            setShowPalette(false);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              {data?.onChangeDirection ? (
                <div className="relative flex items-center">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDirection((d) => !d);
                      setShowPalette(false);
                    }}
                    title="선 방향"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </Button>
                  {showDirection && (
                    <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-white/10 bg-[#11151c]/95 p-1 shadow-xl backdrop-blur-md">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="h-7 px-2 w-auto gap-1.5 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          data.onChangeDirection?.(id, "bidirectional");
                          setShowDirection(false);
                        }}
                        title="양방향"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" /> 양방향
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="h-7 px-2 w-auto gap-1.5 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          data.onChangeDirection?.(id, "unidirectional");
                          setShowDirection(false);
                        }}
                        title="단방향"
                      >
                        <ArrowRight className="h-3.5 w-3.5" /> 단방향
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="h-7 px-2 w-auto gap-1.5 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg text-[11px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          data.onChangeDirection?.(id, "none");
                          setShowDirection(false);
                        }}
                        title="무방향"
                      >
                        <Minus className="h-3.5 w-3.5" /> 무방향
                      </Button>
                    </div>
                  )}
                </div>
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
