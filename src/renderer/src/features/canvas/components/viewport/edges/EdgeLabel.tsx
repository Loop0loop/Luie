/**
 * EdgeLabel — React-Flow EdgeLabelRenderer 래퍼 컴포넌트.
 *
 * EdgeLabelRenderer는 SVG overlay 위에 HTML 레이블을 올리기 위해
 * position/transform 패턴을 프레임워크 계약으로 요구합니다.
 * 이 컴포넌트는 그 보일러플레이트를 한 곳에 격리합니다.
 *
 * color prop이 있으면 text-color와 border-color에 동적으로 적용됩니다.
 * (CanvasEdge처럼 엣지 색상을 레이블에도 반영할 때 사용)
 */

import { EdgeLabelRenderer } from "reactflow";
import type { ReactNode } from "react";
import { HEX_ALPHA_25 } from "../../../constants";

interface EdgeLabelProps {
  labelX: number;
  labelY: number;
  /** 동적 색상 (런타임 hex/CSS variable). 없으면 기본 muted 스타일 적용. */
  color?: string;
  children: ReactNode;
}

export function EdgeLabel({ labelX, labelY, color, children }: EdgeLabelProps) {
  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          pointerEvents: "all",
          // color/borderColor는 런타임 동적값 — 인라인 스타일 정당화됨
          ...(color && {
            color,
            borderColor: `${color}${HEX_ALPHA_25}`, // 25% opacity
          }),
        }}
        className={
          color
            ? "nodrag nopan rounded-full border bg-panel/95 px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm"
            : "nodrag nopan rounded-full border border-border/40 bg-panel/95 px-2 py-0.5 text-[10px] text-muted shadow-sm backdrop-blur-sm"
        }
      >
        {children}
      </div>
    </EdgeLabelRenderer>
  );
}
