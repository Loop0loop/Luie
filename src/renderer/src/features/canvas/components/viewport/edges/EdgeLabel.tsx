/**
 * EdgeLabel — React-Flow EdgeLabelRenderer 래퍼 컴포넌트.
 *
 * EdgeLabelRenderer는 SVG overlay 위에 HTML 레이블을 올리기 위해
 * position/transform 패턴을 프레임워크 계약으로 요구합니다.
 * 이 컴포넌트는 그 보일러플레이트를 한 곳에 격리합니다.
 *
 * color prop이 6-digit hex일 때만 text-color/border-color에 적용.
 * CSS variable(var(--x))이나 3-digit hex는 색상 적용을 건너뛰고
 * 기본 muted 스타일을 유지합니다 (안전한 fallback).
 */

import { EdgeLabelRenderer } from "reactflow";
import type { ReactNode } from "react";

interface EdgeLabelProps {
  labelX: number;
  labelY: number;
  /** 동적 색상 (6-digit hex만 지원). CSS variable이면 적용 안 함. */
  color?: string;
  children: ReactNode;
}

const SIX_DIGIT_HEX = /^#[0-9a-fA-F]{6}$/;

export function EdgeLabel({ labelX, labelY, color, children }: EdgeLabelProps) {
  const safeColor = color && SIX_DIGIT_HEX.test(color) ? color : undefined;
  const borderColor = safeColor ? `${safeColor}40` : undefined; // 25% alpha

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          pointerEvents: "all",
          ...(safeColor && { color: safeColor, borderColor }),
        }}
        className={
          safeColor
            ? "nodrag nopan rounded-control border bg-panel/95 px-2.5 py-0.5 text-canvas-edge-label font-medium shadow-sm backdrop-blur-sm"
            : "nodrag nopan rounded-control border border-border bg-panel/95 px-2.5 py-0.5 text-canvas-edge-label text-muted shadow-sm backdrop-blur-sm"
        }
      >
        {children}
      </div>
    </EdgeLabelRenderer>
  );
}
