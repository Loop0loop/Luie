import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { GraphNodeData } from "../../types/graph";

// 등급별 가변 크기 계산 (Figma 포스 디렉티드 스펙)
const SIZE_CLASSES = {
  prime: "h-8 w-8", // 중심 거성 (32px)
  major: "h-4.5 w-4.5", // 중간 조연/사건 (18px)
  minor: "h-2.5 w-2.5", // 주변 노드 (10px)
} as const;

function PensiveNode({ data, selected }: NodeProps<GraphNodeData>) {
  const { t } = useTranslation();
  const isChapter = data.type === "chapter";
  const isFocused = selected || data.isFocused;

  // 등급별 링 및 발광 섀도우 효과 (Constellation Monotone Standard)
  const starGradeClass = isChapter
    ? isFocused
      ? "bg-foreground ring-4 ring-foreground/25 shadow-[0_0_15px_currentColor] scale-110"
      : "bg-muted-foreground/60 border border-border/40 shadow-[0_0_6px_currentColor] hover:scale-125 hover:bg-foreground"
    : data.starGrade === "prime"
      ? "bg-foreground ring-4 ring-foreground/30 shadow-[0_0_20px_currentColor]" // 흑백/실버 코어 거성
      : data.starGrade === "major"
        ? isFocused
          ? "bg-foreground ring-4 ring-foreground/20 shadow-[0_0_12px_currentColor] scale-110"
          : "bg-muted-foreground/80 border border-border/50 shadow-[0_0_8px_rgba(255,255,255,0.25)] hover:scale-125 hover:bg-foreground"
        : isFocused
          ? "bg-foreground ring-4 ring-foreground/15 shadow-[0_0_10px_currentColor] scale-110"
          : "bg-muted/40 border border-border/30 shadow-[0_0_4px_rgba(255,255,255,0.1)] hover:scale-125 hover:bg-foreground";

  return (
    <div
      style={{ opacity: data.opacity ?? 1.0 }}
      className={cn(
        "group relative flex items-center justify-center transition-all duration-300 cursor-pointer",
        isChapter ? "rounded-sm" : "rounded-full",
        SIZE_CLASSES[data.starGrade ?? "minor"],
        starGradeClass
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Label - Shows on hover or if selected/focused */}
      <div
        className={cn(
          "absolute top-full mt-2.5 whitespace-nowrap text-[10px] font-bold tracking-tight transition-all duration-300 pointer-events-none px-2.5 py-0.5 rounded-full bg-surface/95 border border-border/30 shadow-lg text-fg z-50",
          isFocused 
            ? "opacity-100 translate-y-0 scale-100" 
            : "opacity-0 -translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
        )}
      >
        {data.label}
        {data.starGrade === "prime" && (
          <span className="ml-1 text-[8px] font-black text-accent-foreground bg-accent px-1.5 py-0.5 rounded-sm uppercase tracking-widest shrink-0">{t("canvas.node.coreBadge")}</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export default memo(PensiveNode);
