import { memo } from "react";
import { Handle, Position, type NodeProps, useViewport } from "reactflow";
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
  const { zoom } = useViewport();
  const isChapter = data.type === "chapter";
  const isFocused = selected || data.isFocused;

  // 줌아웃에 따른 역스케일링 배율 산출 (0.75배에서 최대 2.5배까지 유려하게 클램핑)
  const inverseScale = Math.min(Math.max(1 / zoom, 0.75), 2.5);

  // 등급별 링 및 발광 섀도우 효과 (웹소설 수사 단서판 & 성운 광배 융합 이펙트)
  const starGradeClass = isChapter
    ? isFocused
      ? "bg-foreground ring-4 ring-foreground/30 shadow-[0_0_18px_currentColor] scale-110"
      : "bg-muted-foreground/60 border border-border/40 shadow-[0_0_8px_currentColor] hover:scale-125 hover:bg-foreground"
    : data.starGrade === "prime"
      ? "bg-foreground ring-4 ring-foreground/40 shadow-[0_0_24px_rgba(255,255,255,0.85),0_0_12px_rgba(239,68,68,0.4)]" // 우주적 초거성 & 수사판 레드 코어 액센트가 결합된 태양성 글로우
      : data.starGrade === "major"
        ? isFocused
          ? "bg-foreground ring-4 ring-foreground/25 shadow-[0_0_16px_rgba(255,255,255,0.6)] scale-110"
          : "bg-muted-foreground/80 border border-border/50 shadow-[0_0_10px_rgba(255,255,255,0.3)] hover:scale-125 hover:bg-foreground"
        : isFocused
          ? "bg-foreground ring-4 ring-foreground/20 shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-110"
          : "bg-muted/40 border border-border/30 shadow-[0_0_6px_rgba(255,255,255,0.15)] hover:scale-125 hover:bg-foreground";

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
      
      {/* Label & Character Details Hover Card (역스케일링 적용 반응형 모달) */}
      <div
        style={{
          transform: `scale(${inverseScale}) translate(-50%, 0)`,
          transformOrigin: "top center",
          left: "50%",
        }}
        className={cn(
          "absolute top-full mt-3.5 whitespace-nowrap transition-all duration-300 pointer-events-none px-4 py-2.5 rounded-lg bg-surface/95 border border-border/60 shadow-2xl text-fg z-50 flex flex-col gap-1 min-w-[200px] max-w-[280px]",
          isFocused 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 -translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/30 pb-1.5">
          <span className="text-[12px] font-extrabold tracking-tight text-foreground">{data.label}</span>
          {data.type && (
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">
              {t(`canvas.node.kind.${data.type}` as never, data.type)}
            </span>
          )}
        </div>
        
        {data.description && (
          <p className="text-[10px] text-muted-foreground whitespace-normal leading-relaxed break-keep">
            {data.description}
          </p>
        )}
        
        {data.starGrade === "prime" && (
          <div className="mt-1.5 flex justify-end">
            <span className="text-[8px] font-black text-accent-foreground bg-accent px-1.5 py-0.5 rounded-sm uppercase tracking-widest shrink-0">
              {t("canvas.node.coreBadge")}
            </span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export default memo(PensiveNode);
