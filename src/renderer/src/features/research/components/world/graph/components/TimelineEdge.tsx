import { memo } from "react";
import { type EdgeProps, getBezierPath, BaseEdge } from "reactflow";
import { cn } from "@renderer/lib/utils";

export const TimelineEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
  animated,
}: EdgeProps) => {
  // 타임라인 특유의 부드럽게 이어지는 곡선을 위한 베지어 패스 계산
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g className={cn("transition-all duration-300", selected ? "opacity-100" : "opacity-70 hover:opacity-100")}>
      {/* 1. 가장 넓게 퍼진 아우라 (Glow) */}
      <BaseEdge
        id={`${id}-aura`}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 18 : 12,
          stroke: "hsl(var(--primary))",
          strokeOpacity: selected ? 0.15 : 0.08,
          filter: "blur(6px)",
          strokeLinecap: "round",
        }}
      />
      {/* 2. 중간 두께의 코어 후광 */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 8 : 4,
          stroke: "hsl(var(--primary))",
          strokeOpacity: selected ? 0.4 : 0.2,
          filter: "blur(2px)",
          strokeLinecap: "round",
        }}
      />
      {/* 3. 실제 흐르는 엣지 선 + 애니메이션 조건부 적용 */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: "hsl(var(--primary))",
          strokeLinecap: "round",
          ...(animated && {
            strokeDasharray: "10,10",
            animation: "flow 2s linear infinite"
          })
        }}
      />
    </g>
  );
});

TimelineEdge.displayName = "TimelineEdge";
