import { memo } from "react";
import { Trash2 } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position, NodeToolbar } from "reactflow";
import { Button } from "@renderer/components/ui/button";

export type CanvasTimelineBlockData = {
  label: string;
  date?: string;
  description?: string;
  onDelete?: (id: string) => void;
};

/**
 * 평행세계 분기점 스타일 타임라인 노드.
 *
 * 구조:
 *   ─── ● ───
 *       │
 *   [컨텐츠]
 *
 * 좌우(Left/Right)로 타임라인 축이 지나가고,
 * 위아래(Top/Bottom)로 분기 연결을 허용한다.
 * 중앙 점(●)이 분기점 역할을 시각적으로 표현한다.
 */
function CanvasTimelineBlockNodeInner({
  id,
  data,
  selected,
}: NodeProps<CanvasTimelineBlockData>) {
  const accentColor = selected
    ? "rgba(243,200,107,1)"
    : "rgba(243,200,107,0.72)";
  const lineColor = selected
    ? "rgba(243,200,107,0.55)"
    : "rgba(243,200,107,0.22)";
  const cardBg = selected ? "rgba(243,200,107,0.06)" : "rgba(17,20,27,0.82)";
  const cardBorder = selected
    ? "rgba(243,200,107,0.45)"
    : "rgba(255,255,255,0.09)";

  return (
    <div className="group relative flex flex-col items-center cursor-grab active:cursor-grabbing">
      <NodeToolbar isVisible={selected} position={Position.Top} offset={52}>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#11151c]/95 p-1 shadow-xl backdrop-blur-md">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </NodeToolbar>

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: accentColor,
          top: "18px",
          width: 8,
          height: 8,
          border: "none",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        className="group-hover:!opacity-100"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: accentColor,
          top: "18px",
          width: 8,
          height: 8,
          border: "none",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        className="group-hover:!opacity-100"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: accentColor,
          width: 8,
          height: 8,
          border: "none",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        className="group-hover:!opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: accentColor,
          width: 8,
          height: 8,
          border: "none",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        className="group-hover:!opacity-100"
      />

      <div className="relative flex w-full items-center" style={{ height: 36 }}>
        <div
          className="flex-1 transition-all"
          style={{ height: 1.5, background: lineColor }}
        />
        <div
          className="relative z-10 shrink-0 rounded-full transition-all"
          style={{
            width: selected ? 14 : 10,
            height: selected ? 14 : 10,
            background: accentColor,
            boxShadow: selected
              ? `0 0 0 4px rgba(243,200,107,0.15), 0 0 16px rgba(243,200,107,0.35)`
              : `0 0 0 2px rgba(243,200,107,0.1)`,
          }}
        />
        <div
          className="flex-1 transition-all"
          style={{ height: 1.5, background: lineColor }}
        />
      </div>

      <div
        className="transition-all"
        style={{ width: 1.5, height: 12, background: lineColor }}
      />

      <div
        className="flex min-w-[200px] max-w-[300px] flex-col rounded-xl border px-4 py-3 transition-all"
        style={{
          background: cardBg,
          borderColor: cardBorder,
          boxShadow: selected
            ? `0 0 0 1px rgba(243,200,107,0.18), 0 8px 24px rgba(0,0,0,0.32)`
            : `0 2px 12px rgba(0,0,0,0.22)`,
          backdropFilter: "blur(8px)",
        }}
      >
        {data.date && (
          <span
            className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: "rgba(243,200,107,0.6)" }}
          >
            {data.date}
          </span>
        )}
        <span className="text-[13px] font-semibold leading-snug text-fg/90">
          {data.label}
        </span>
        {data.description && (
          <span className="mt-1.5 text-[11px] leading-relaxed text-fg/45">
            {data.description}
          </span>
        )}
      </div>
    </div>
  );
}

export const CanvasTimelineBlockNode = memo(CanvasTimelineBlockNodeInner);
