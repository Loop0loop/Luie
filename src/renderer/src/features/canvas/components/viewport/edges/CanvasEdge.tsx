/**
 * CanvasEdge — 자유 연결 캔버스 엣지 (Obsidian Canvas 스타일).
 *
 * stroke 색상만 런타임 동적값이므로 인라인 스타일로 유지합니다.
 * strokeWidth / opacity / transition은 상수 참조로 처리합니다.
 */

import { memo } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";
import { CANVAS_FREE_EDGE_DEFAULTS, CANVAS_EDGE_BORDER_RADIUS } from "../../../constants";
import type { RFCanvasEdgeData } from "../../../types/reactFlow.types";
import { EdgeLabel } from "./EdgeLabel";

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
    borderRadius: CANVAS_EDGE_BORDER_RADIUS,
  });

  // stroke 색상만 런타임 동적값 — 인라인 스타일 정당화됨
  const strokeColour = data?.color ?? "var(--accent-bg)";
  const label = data?.label;
  const isBidirectional = data?.direction === "bidirectional";

  const strokeWidth = selected
    ? CANVAS_FREE_EDGE_DEFAULTS.strokeWidthSelected
    : CANVAS_FREE_EDGE_DEFAULTS.strokeWidth;

  const opacity = selected
    ? CANVAS_FREE_EDGE_DEFAULTS.opacitySelected
    : CANVAS_FREE_EDGE_DEFAULTS.opacity;

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
          transition: `stroke-width ${CANVAS_FREE_EDGE_DEFAULTS.transitionDuration}ms, opacity ${CANVAS_FREE_EDGE_DEFAULTS.transitionDuration}ms`,
        }}
      />

      {label && (
        <EdgeLabel labelX={labelX} labelY={labelY} color={strokeColour}>
          {label}
        </EdgeLabel>
      )}
    </>
  );
}

export const CanvasEdge = memo(CanvasEdgeInner);
