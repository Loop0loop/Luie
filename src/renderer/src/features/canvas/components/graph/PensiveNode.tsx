import { memo } from "react";
import { Handle, Position, type NodeProps, useViewport } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";

// 등급별 가변 크기 계산 (Figma 포스 디렉티드 스펙)
const SIZE_CLASSES = {
  prime: "h-8 w-8", // 중심 거성 (32px)
  major: "h-4.5 w-4.5", // 중간 조연/사건 (18px)
  minor: "h-2.5 w-2.5", // 주변 노드 (10px)
} as const;

// 줌 역스케일링 배율의 안전 한계치 상수화
const INVERSE_SCALE_MIN = 0.75 as const;
const INVERSE_SCALE_MAX = 4.5 as const;

function PensiveNode({ id, data, selected }: NodeProps<GraphNodeData>) {
  const { t } = useTranslation();
  const { zoom } = useViewport();
  const setHoverId = useGraphStore((state) => state.setHoverId);
  const isChapter = data.type === "chapter";
  const isFocused = selected || data.isFocused;

  // 줌아웃에 따른 역스케일링 배율 산출 (상수 기반의 안전 경계 연산)
  const inverseScale = Math.min(Math.max(1 / zoom, INVERSE_SCALE_MIN), INVERSE_SCALE_MAX);

  // 등급별 기하 형태 분기 (인물은 원형, 사건은 다이아몬드, 단체는 사각형, 챕터는 초소형 큐브)
  const shapeClass = isChapter
    ? "rounded-sm"
    : data.type === "character"
      ? "rounded-full"
      : data.type === "event"
        ? "rotate-45 rounded-control"
        : "rounded-panel";

  // 포커스 강조: 네온 발광 대신 토큰 기반 링으로 톤다운 (평형 다이어그램)
  const starGradeClass = isChapter
    ? isFocused
      ? "bg-fg ring-2 ring-accent/50"
      : "bg-muted/60 border border-border/40 hover:bg-fg"
    : data.starGrade === "prime"
      ? "bg-fg ring-2 ring-accent/40"
      : data.starGrade === "major"
        ? isFocused
          ? "bg-fg ring-2 ring-accent/40"
          : "bg-muted/80 border border-border/50 hover:bg-fg"
        : isFocused
          ? "bg-fg ring-2 ring-accent/40"
          : "bg-muted/40 border border-border/30 hover:bg-fg";

  return (
    <div
      style={{ opacity: data.opacity ?? 1.0 }}
      onMouseEnter={() => setHoverId(id)}
      onMouseLeave={() => setHoverId(null)}
      className={cn(
        "group relative flex items-center justify-center transition-all duration-300 cursor-pointer",
        shapeClass,
        SIZE_CLASSES[data.starGrade ?? "minor"],
        starGradeClass,
        data.isInteractive === false && "pointer-events-none"
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Label & Character Details Hover Card (역스케일링 적용 반응형 모달 - 테마 최적화) */}
      <div
        style={{
          transform: `scale(${inverseScale}) translate(-50%, 0)`,
          transformOrigin: "top center",
          left: "50%",
        }}
        className={cn(
          "absolute top-full mt-3.5 whitespace-nowrap transition-all duration-300 pointer-events-none px-4 py-2.5 rounded-panel bg-panel/95 border border-border/40 shadow-panel text-fg z-50 flex flex-col gap-1 min-w-[200px] max-w-[280px] opacity-0 -translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/20 pb-1.5">
          <span className="text-[12px] font-extrabold tracking-tight text-fg">{data.label}</span>
          {data.type && (
            <span className="text-[9px] uppercase tracking-wider font-semibold text-muted bg-element border border-border/20 px-1.5 py-0.5 rounded-sm">
              {t(`canvas.node.kind.${data.type}` as never, data.type)}
            </span>
          )}
        </div>
        
        {data.description && (
          <p className="text-[10px] text-muted whitespace-normal leading-relaxed break-keep">
            {data.description}
          </p>
        )}
        
        {data.starGrade === "prime" && (
          <div className="mt-1.5 flex justify-end">
            <span className="text-[8px] font-black text-on-accent bg-accent px-1.5 py-0.5 rounded-sm uppercase tracking-widest shrink-0">
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
