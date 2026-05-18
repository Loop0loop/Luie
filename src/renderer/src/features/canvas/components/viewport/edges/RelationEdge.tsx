/**
 * RelationEdge — Obsidian Canvas 스타일 관계 엣지.
 *
 * strokeWidth / opacity / transition은 data-selected attribute + CSS로 처리합니다.
 * stroke 색상만 런타임 동적값이므로 인라인 스타일로 유지합니다 (M1 수정).
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { CANVAS_RELATION_EDGE_DEFAULTS } from "../../../constants";
import type { RFRelationEdgeData } from "../../../types/reactFlow.types";

function RelationEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<RFRelationEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // stroke 색상만 런타임 동적값 — 인라인 스타일 정당화됨
  const strokeColour = selected
    ? "var(--accent-bg)"
    : (data?.color ?? "var(--text-secondary)");

  const strokeWidth = selected
    ? CANVAS_RELATION_EDGE_DEFAULTS.strokeWidthSelected
    : CANVAS_RELATION_EDGE_DEFAULTS.strokeWidth;

  const opacity = selected
    ? CANVAS_RELATION_EDGE_DEFAULTS.opacitySelected
    : CANVAS_RELATION_EDGE_DEFAULTS.opacity;

  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColour,
          strokeWidth,
          opacity,
          transition: `stroke ${CANVAS_RELATION_EDGE_DEFAULTS.transitionDuration}ms, stroke-width ${CANVAS_RELATION_EDGE_DEFAULTS.transitionDuration}ms, opacity ${CANVAS_RELATION_EDGE_DEFAULTS.transitionDuration}ms`,
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan rounded-full border border-border/40 bg-panel/95 px-2 py-0.5 text-[10px] text-muted shadow-sm backdrop-blur-sm"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeInner);
