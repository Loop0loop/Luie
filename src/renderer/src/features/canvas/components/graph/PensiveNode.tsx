import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";

// 등급별 가변 크기 계산 (더 큰 크기로 상향 조정)
const SIZE_CLASSES = {
  prime: "h-16 w-16", // 중심 거성 (64px) - 2배 증가
  major: "h-12 w-12", // 중간 조연/사건 (48px) - 2.6배 증가
  minor: "h-9 w-9", // 주변 노드 (36px) - 3.6배 증가
} as const;

function PensiveNode({ id, data, selected }: NodeProps<GraphNodeData>) {
  const { t } = useTranslation();
  const setHoverId = useGraphStore((state) => state.setHoverId);
  const isChapter = data.type === "chapter";
  const isFocused = selected || data.isFocused;

  // 등급별 기하 형태 분기 (인물은 원형, 사건은 다이아몬드, 단체는 사각형, 챕터는 소형 큐브)
  const shapeClass = isChapter
    ? "rounded-lg"
    : data.type === "character"
      ? "rounded-full"
      : data.type === "event"
        ? "rotate-45 rounded-lg"
        : "rounded-xl";

  // 포커스 강조: 토큰 기반 링으로 톤다운
  const starGradeClass = isChapter
    ? isFocused
      ? "bg-fg ring-4 ring-accent/60 shadow-lg"
      : "bg-muted/70 border-2 border-border/50 hover:bg-fg hover:shadow-md"
    : data.starGrade === "prime"
      ? "bg-fg ring-4 ring-accent/50 shadow-lg"
      : data.starGrade === "major"
        ? isFocused
          ? "bg-fg ring-4 ring-accent/50 shadow-lg"
          : "bg-muted/85 border-2 border-border/60 hover:bg-fg hover:shadow-md"
        : isFocused
          ? "bg-fg ring-4 ring-accent/50 shadow-lg"
          : "bg-muted/50 border-2 border-border/40 hover:bg-fg hover:shadow-md";

  return (
    <div
      style={{ opacity: data.opacity ?? 1.0 }}
      onMouseEnter={() => setHoverId(id)}
      onMouseLeave={() => setHoverId(null)}
      className={cn(
        "group relative flex items-center justify-center transition-[background-color,border-color,box-shadow,opacity] duration-200 cursor-pointer",
        shapeClass,
        SIZE_CLASSES[data.starGrade ?? "minor"],
        starGradeClass,
        data.isInteractive === false && "pointer-events-none"
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* 항상 표시되는 라벨 (노드 하단) */}
      <div className="absolute top-full mt-2 whitespace-nowrap pointer-events-none px-2 py-1 rounded-md bg-panel/90 border border-border/30 shadow-sm text-fg z-10">
        <span className="text-[11px] font-bold tracking-tight text-fg">{data.label}</span>
        {data.type && (
          <span className="ml-1.5 text-[8px] uppercase tracking-wider font-semibold text-muted">
            {t(`canvas.node.kind.${data.type}` as never, data.type)}
          </span>
        )}
      </div>

      {/* 호버 시 상세 정보 카드 */}
      <div
        className={cn(
          "absolute top-full mt-12 whitespace-nowrap pointer-events-none px-4 py-2.5 rounded-lg bg-panel/95 border border-border/40 shadow-lg text-fg z-50 flex flex-col gap-1.5 min-w-[220px] max-w-[300px] opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/20 pb-1.5">
          <span className="text-[13px] font-extrabold tracking-tight text-fg">{data.label}</span>
          {data.type && (
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted bg-element border border-border/20 px-1.5 py-0.5 rounded-sm">
              {t(`canvas.node.kind.${data.type}` as never, data.type)}
            </span>
          )}
        </div>
        
        {data.description && (
          <p className="text-[11px] text-muted whitespace-normal leading-relaxed break-keep">
            {data.description}
          </p>
        )}
        
        {data.starGrade === "prime" && (
          <div className="mt-1 flex justify-end">
            <span className="text-[8px] font-black text-on-accent bg-accent px-2 py-0.5 rounded-sm uppercase tracking-widest shrink-0">
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
