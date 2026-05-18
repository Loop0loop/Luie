/**
 * CanvasEdge — 자유 연결 캔버스 엣지 (Obsidian Canvas 스타일).
 *
 * 디자인 레퍼런스:
 *   - 기본 색상: var(--accent-bg) (사용자 지정 색상 지원)
 *   - smooth step 경로 (borderRadius: 12)
 *   - 양방향 화살표 지원
 *   - 레이블: pill 형태, 색상 tint
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
          strokeWidth: selected ? 2.5 : 2,
          opacity: selected ? 1 : 0.8,
          transition: "stroke-width 0.15s, opacity 0.15s",
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
