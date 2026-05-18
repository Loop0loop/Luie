/**
 * CanvasEdge — 자유 연결 캔버스 엣지 (Obsidian Canvas 스타일).
 *
 * strokeWidth / opacity / transition은 className으로 처리합니다.
 * stroke 색상과 borderColor만 런타임 동적값이므로 인라인 스타일로 유지합니다 (M1 수정).
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";
import { CANVAS_CANVAS_EDGE_DEFAULTS } from "../../../constants";
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
  selected,
}: EdgeProps<RFCanvasEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  // stroke 색상만 런타임 동적값 — 인라인 스타일 정당화됨
  const strokeColour = data?.color ?? "var(--accent-bg)";
  const label = data?.label;
  const isBidirectional = data?.direction === "bidirectional";

  const strokeWidth = selected
    ? CANVAS_CANVAS_EDGE_DEFAULTS.strokeWidthSelected
    : CANVAS_CANVAS_EDGE_DEFAULTS.strokeWidth;

  const opacity = selected
    ? CANVAS_CANVAS_EDGE_DEFAULTS.opacitySelected
    : CANVAS_CANVAS_EDGE_DEFAULTS.opacity;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={isBidirectional ? markerStart : undefined}
        style={{
          stroke: strokeColour,
          strokeWidth,
          opacity,
          transition: `stroke-width ${CANVAS_CANVAS_EDGE_DEFAULTS.transitionDuration}ms, opacity ${CANVAS_CANVAS_EDGE_DEFAULTS.transitionDuration}ms`,
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
              borderColor: `${strokeColour}40`,
            }}
            className="nodrag nopan rounded-full border bg-panel/95 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const CanvasEdge = memo(CanvasEdgeInner);
