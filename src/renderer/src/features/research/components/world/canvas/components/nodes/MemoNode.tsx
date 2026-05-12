import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { StickyNote } from "lucide-react";
import { cn } from "@renderer/lib/utils";

export type MemoNodeData = {
  content: string;
  color?: string;
};

const COLOR_MAP: Record<string, string> = {
  default: "border-zinc-500/20 bg-zinc-500/8",
  yellow:  "border-amber-500/30 bg-amber-500/10",
  blue:    "border-sky-500/30 bg-sky-500/10",
  green:   "border-emerald-500/30 bg-emerald-500/10",
  pink:    "border-rose-500/30 bg-rose-500/10",
};

export const MemoNode = memo(function MemoNode({ data, selected }: NodeProps<MemoNodeData>) {
  const colorClass = COLOR_MAP[data.color ?? "default"] ?? COLOR_MAP.default;

  return (
    <div
      className={cn(
        "relative w-[200px] rounded-xl border p-3 shadow-sm backdrop-blur-sm transition-all duration-150",
        colorClass,
        selected && "ring-1 ring-white/15 shadow-md",
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-border/50 !bg-element" />

      <div className="mb-2 flex items-center gap-1.5 text-muted">
        <StickyNote size={11} />
        <span className="text-[9px] uppercase tracking-widest font-semibold">Note</span>
      </div>

      <p className="line-clamp-6 whitespace-pre-wrap text-[12px] leading-relaxed text-fg/90">
        {data.content || <span className="italic text-muted">Empty note</span>}
      </p>

      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-border/50 !bg-element" />
    </div>
  );
});
