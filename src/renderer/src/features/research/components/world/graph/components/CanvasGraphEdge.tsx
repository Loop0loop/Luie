import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { ENTITY_TYPE_CANVAS_THEME } from "../constants";
import { CANVAS_EDGE_COLORS } from "../utils/canvasFlowUtils";

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
  const { t } = useTranslation();
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
    stroke: ENTITY_TYPE_CANVAS_THEME.WorldEntity.edge,
    selectedStroke: ENTITY_TYPE_CANVAS_THEME.WorldEntity.selectedEdge,
    glow: ENTITY_TYPE_CANVAS_THEME.WorldEntity.glow,
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
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-popover/95 p-1 shadow-xl backdrop-blur-md transition-all">
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="h-7 w-7 rounded-md text-fg/70 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  data?.onDelete?.(id);
                }}
                title={t("research.graph.canvas.edge.delete")}
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
                title={t("research.graph.canvas.edge.zoom")}
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
                    title={t("research.graph.canvas.edge.changeColor")}
                  >
                    <Palette className="h-3.5 w-3.5" />
                  </Button>
                  {showPalette && (
                    <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-lg border border-white/10 bg-popover/95 p-1.5 shadow-xl backdrop-blur-md">
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
                    title={t("research.graph.canvas.edge.direction")}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </Button>
                  {showDirection && (
                    <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-lg border border-white/10 bg-popover/95 p-1 shadow-xl backdrop-blur-md">
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
                        title={t("research.graph.canvas.edge.bidirectional")}
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" />
                        {t("research.graph.canvas.edge.bidirectional")}
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
                        title={t("research.graph.canvas.edge.unidirectional")}
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        {t("research.graph.canvas.edge.unidirectional")}
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
                        title={t("research.graph.canvas.edge.none")}
                      >
                        <Minus className="h-3.5 w-3.5" />
                        {t("research.graph.canvas.edge.none")}
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
                  title={t("research.graph.canvas.edge.editRelation")}
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
                  title={t("research.graph.canvas.edge.edit")}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          )}
          {label && (
            <div
              className="rounded-full border bg-popover/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide"
              style={{
                borderColor: strokeColor,
                color: selected
                  ? "hsl(var(--foreground) / 0.92)"
                  : "hsl(var(--foreground) / 0.62)",
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
