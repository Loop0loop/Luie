import { memo } from "react";
import { type EdgeProps, getBezierPath, BaseEdge } from "reactflow";
import { cn } from "@renderer/lib/utils";

export const TimelineEdge = memo(
  ({
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
      <g
        className={cn(
          "transition-all duration-300",
          selected ? "opacity-100" : "opacity-80 hover:opacity-100",
        )}
      >
        {/* 1. 가장 넓게 퍼진 아우라 (Glow - Purple/Deep Blue) */}
        <BaseEdge
          id={`${id}-aura-deep`}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: selected ? 24 : 16,
            stroke: "#6a0dad", // Deep purple
            strokeOpacity: selected ? 0.3 : 0.2,
            filter: "blur(12px)",
            strokeLinecap: "round",
          }}
        />
        {/* 2. 두 번째 아우라 (Glow - Blue/Cyan) */}
        <BaseEdge
          id={`${id}-aura-mid`}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: selected ? 14 : 10,
            stroke: "#00bfff", // Deep sky blue
            strokeOpacity: selected ? 0.6 : 0.4,
            filter: "blur(6px)",
            strokeLinecap: "round",
          }}
        />
        {/* 3. 코어 후광 (Glow - Bright Cyan) */}
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            ...style,
            strokeWidth: selected ? 8 : 5,
            stroke: "#00ffff", // Cyan
            strokeOpacity: selected ? 0.9 : 0.7,
            filter: "blur(2px)",
            strokeLinecap: "round",
          }}
        />
        {/* 4. 실제 흐르는 엣지 선 (White core) */}
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: selected ? 3 : 2,
            stroke: "#ffffff", // Pure white core
            strokeLinecap: "round",
            ...(animated && {
              strokeDasharray: "15,10",
              animation: "flow 1.5s linear infinite",
            }),
          }}
        />
      </g>
    );
  },
);

TimelineEdge.displayName = "TimelineEdge";
