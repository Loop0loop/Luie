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

function CanvasTimelineBlockNodeInner({
  id,
  data,
  selected,
}: NodeProps<CanvasTimelineBlockData>) {
  return (
    <div className="group relative cursor-grab active:cursor-grabbing">
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
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
        className="!h-2.5 !w-2.5 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "rgba(243,200,107,0.9)", top: "50%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2.5 !w-2.5 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "rgba(243,200,107,0.9)", top: "50%" }}
      />

      <div
        className="relative flex min-w-[220px] max-w-[340px] flex-col rounded-xl border transition-all"
        style={{
          background: selected
            ? "rgba(243,200,107,0.05)"
            : "rgba(255,255,255,0.025)",
          borderColor: selected
            ? "rgba(243,200,107,0.55)"
            : "rgba(255,255,255,0.10)",
          boxShadow: selected
            ? "0 0 0 1px rgba(243,200,107,0.2), 0 8px 24px rgba(0,0,0,0.28)"
            : "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <div
          className="flex items-center gap-2 border-b px-4 py-2.5"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "rgba(243,200,107,0.85)" }}
          />
          <span
            className="text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: "rgba(243,200,107,0.65)" }}
          >
            {data.date ?? "Timeline"}
          </span>
        </div>

        <div className="px-4 py-3">
          <p className="text-[14px] font-semibold leading-snug text-fg/90">
            {data.label}
          </p>
          {data.description && (
            <p className="mt-1.5 text-[12px] leading-relaxed text-fg/45">
              {data.description}
            </p>
          )}
        </div>

        <div
          className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(243,200,107,0.18) 15%, rgba(243,200,107,0.18) 85%, transparent 100%)",
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      </div>
    </div>
  );
}

export const CanvasTimelineBlockNode = memo(CanvasTimelineBlockNodeInner);
