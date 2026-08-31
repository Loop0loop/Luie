/** 6-digit hex만 inline color로 허용하고 나머지는 기본 token으로 표시한다. */
import { EdgeLabelRenderer } from "reactflow";
import type { ReactNode } from "react";

interface EdgeLabelProps {
  labelX: number;
  labelY: number;
  color?: string;
  children: ReactNode;
}

const SIX_DIGIT_HEX = /^#[0-9a-fA-F]{6}$/;

export function EdgeLabel({ labelX, labelY, color, children }: EdgeLabelProps) {
  const safeColor = color && SIX_DIGIT_HEX.test(color) ? color : undefined;
  const borderColor = safeColor ? `${safeColor}40` : undefined;

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
            ? "nodrag nopan rounded-control border bg-panel/95 px-2.5 py-0.5 text-canvas-edge-label font-medium shadow-control backdrop-blur-xs"
            : "nodrag nopan rounded-control border border-border bg-panel/95 px-2.5 py-0.5 text-canvas-edge-label text-muted shadow-control backdrop-blur-xs"
        }
      >
        {children}
      </div>
    </EdgeLabelRenderer>
  );
}
