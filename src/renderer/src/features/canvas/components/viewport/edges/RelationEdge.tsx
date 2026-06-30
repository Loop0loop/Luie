/**
 * RelationEdge — Obsidian Canvas 스타일 관계 엣지.
 *
 * stroke 색상만 런타임 동적값이므로 인라인 스타일로 유지합니다.
 * strokeWidth / opacity / transition은 상수 참조로 처리합니다.
 *
 * 선택 상태: Obsidian Canvas는 파랑 대신 기본 stroke를 진하게 유지.
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

  // Obsidian Canvas: 선택 시 파랑 accent 대신 기본 색상 유지 + 진하기만 강조.
  // data.color가 없으면 text-secondary 토큰 사용 (선택 여부와 무관).
  const strokeColour = data?.color ?? "var(--text-secondary)";

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

      {label && (
        <EdgeLabel labelX={labelX} labelY={labelY} color={data?.color}>
          {label}
        </EdgeLabel>
      )}
    </>
  );
}

export const RelationEdge = memo(RelationEdgeInner);
