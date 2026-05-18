/**
 * CanvasEdge — React-Flow custom edge for free-drawn canvas connections.
 * Supports bidirectional arrows and custom colour.
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";
import type { RFCanvasEdgeData } from "../../../types/reactFlow.types";

function CanvasEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  markerStart,
}: EdgeProps<RFCanvasEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const strokeColour = data?.color ?? "var(--accent-bg)";
  const label = data?.label;
  const isBidirectional = data?.direction === "bidirectional";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={isBidirectional ? markerStart : undefined}
        style={{
          stroke: strokeColour,
          strokeWidth: 2,
          opacity: 0.85,
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              color: strokeColour,
            }}
            className="nodrag nopan rounded-sm bg-panel/90 px-1.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CanvasEdge = memo(CanvasEdgeInner);
