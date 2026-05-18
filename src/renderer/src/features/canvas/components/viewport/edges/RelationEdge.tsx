/**
 * RelationEdge — Obsidian Canvas 스타일 관계 엣지.
 *
 * 디자인 레퍼런스:
 *   - 기본 색상: var(--text-muted) (Obsidian 기본 엣지 색상)
 *   - strokeWidth: 1.5px
 *   - 베지어 곡선
 *   - 레이블: 작은 pill, 배경 blur
 *   - 화살표: 작은 closed arrow
 */

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
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

  // Obsidian: 기본 엣지는 muted 색상, 선택 시 accent
  const strokeColour = selected
    ? "var(--accent-bg)"
    : (data?.color ?? "var(--text-secondary)");
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColour,
          strokeWidth: selected ? 2 : 1.5,
          opacity: selected ? 1 : 0.6,
          transition: "stroke 0.15s, stroke-width 0.15s, opacity 0.15s",
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
