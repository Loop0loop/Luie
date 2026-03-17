import { memo } from "react";
import { Trash2, GitBranch } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position, NodeToolbar } from "reactflow";
import { Button } from "@renderer/components/ui/button";
import { cn } from "@renderer/lib/utils";

export type CanvasTimelineBlockData = {
  label: string;
  date?: string;
  description?: string;
  onDelete?: (id: string) => void;
  onAddBranch?: (id: string) => void;
};

export const CanvasTimelineBlockNode = memo(({ id, data, selected }: NodeProps<CanvasTimelineBlockData>) => {
  const { label, date, description, onDelete, onAddBranch } = data;

  return (
    <div className="group relative flex flex-col items-center">
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex gap-1 rounded-md border border-white/10 bg-[#0b0e13]/95 p-1 shadow-xl backdrop-blur-md">
          <Button
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 text-fg/50 hover:bg-white/5 hover:text-red-400"
            onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 text-fg/50 hover:bg-white/5 hover:text-[#f3c86b]"
            onClick={(e) => { e.stopPropagation(); onAddBranch?.(id); }}
            title="분계점 추가"
          >
            <GitBranch className="h-3.5 w-3.5" />
          </Button>
        </div>
      </NodeToolbar>

      {/* Timeline Axis Handles */}
      <Handle type="target" position={Position.Left} className="!opacity-0 group-hover:!opacity-100 !bg-[#f3c86b] !border-none !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} className="!opacity-0 group-hover:!opacity-100 !bg-[#f3c86b] !border-none !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Top} id="t" className="!opacity-0 group-hover:!opacity-100 !bg-[#f3c86b]/60 !border-none !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="!opacity-0 group-hover:!opacity-100 !bg-[#f3c86b]/60 !border-none !w-2 !h-2" />

      {/* Branching Point UI */}
      <div className="relative flex w-full items-center justify-center h-8 px-4">
        <div className="absolute inset-x-0 h-px bg-[#f3c86b]/20" />
        <div className={cn(
          "z-10 rounded-full transition-all duration-300",
          selected ? "w-3.5 h-3.5 bg-[#f3c86b] shadow-[0_0_12px_#f3c86b66]" : "w-2.5 h-2.5 bg-[#f3c86b]/60 hover:bg-[#f3c86b]"
        )} />
      </div>

      <div className="h-3 w-px bg-[#f3c86b]/20" />

      {/* Info Card */}
      <div className={cn(
        "flex min-w-[180px] max-w-[280px] flex-col rounded-lg border bg-[#1a1d23]/90 px-4 py-3 shadow-sm backdrop-blur-md transition-all",
        selected ? "border-[#f3c86b]/60 ring-1 ring-[#f3c86b]/20" : "border-white/10 hover:border-white/20"
      )}>
        {date && <span className="mb-0.5 text-[9px] uppercase tracking-widest text-[#f3c86b]/60">{date}</span>}
        <span className="text-[13px] font-medium leading-relaxed text-fg/90">{label}</span>
        {description && <span className="mt-1.5 text-[11px] leading-snug text-fg/40 line-clamp-2">{description}</span>}
      </div>
    </div>
  );
});

CanvasTimelineBlockNode.displayName = "CanvasTimelineBlockNode";
