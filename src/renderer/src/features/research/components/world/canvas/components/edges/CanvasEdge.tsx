import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";
import type { EdgeProps } from "reactflow";
import { cn } from "@renderer/lib/utils";

export type CanvasEdgeData = {
  label?: string;
  color?: string;
};

export const CanvasEdge = memo(function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CanvasEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const stroke = data?.color ?? (selected ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)");

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: selected ? 2 : 1.5,
          transition: "stroke 0.15s, stroke-width 0.15s",
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
            className="pointer-events-none absolute"
          >
            <span
              className={cn(
                "rounded-md border border-border/40 bg-panel/90 px-1.5 py-0.5 text-[10px] leading-none backdrop-blur-sm",
                selected ? "text-fg" : "text-muted",
              )}
            >
              {data.label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
