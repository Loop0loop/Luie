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

  // NOTE: 선택 상태에서도 색은 바꾸지 않고 stroke 강도만 높인다.
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
