import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";

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

  const shapeClass = isChapter
    ? "rounded-lg"
    : data.type === "character"
      ? "rounded-full"
      : data.type === "event"
        ? "rotate-45 rounded-lg"
        : "rounded-xl";

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
      
      <div className="absolute top-full mt-2 whitespace-nowrap pointer-events-none px-2 py-1 rounded-md bg-panel/90 border border-border/30 shadow-sm text-fg z-10">
        <span className="text-[11px] font-bold tracking-tight text-fg">{data.label}</span>
        {data.type && (
          <span className="ml-1.5 text-[8px] uppercase tracking-wider font-semibold text-muted">
            {t(`canvas.node.kind.${data.type}` as never, data.type)}
          </span>
        )}
      </div>


      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export default memo(PensiveNode);
