/**
 * RelationEdge — Obsidian Canvas 스타일 관계 엣지.
 *
 * stroke 색상만 런타임 동적값이므로 인라인 스타일로 유지합니다.
 * strokeWidth / opacity / transition은 상수 참조로 처리합니다.
 */

import { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { getEdgeStyle } from "../../../utils/edgeStyles";
import type { RFRelationEdgeData } from "../../../types/reactFlow.types";
import { EdgeLabel } from "./EdgeLabel";

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

  const strokeColour = selected
    ? "var(--accent-bg)"
    : (data?.color ?? "var(--text-secondary)");

  const edgeStyle = getEdgeStyle(selected ?? false, strokeColour);
  const label = data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />

      {/* color 없음 → EdgeLabel이 기본 muted 스타일 적용 */}
      {label && (
        <EdgeLabel labelX={labelX} labelY={labelY}>
          {label}
        </EdgeLabel>
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeInner);
