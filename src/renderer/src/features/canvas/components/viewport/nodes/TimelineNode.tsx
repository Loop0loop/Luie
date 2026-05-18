/**
 * TimelineNode — React-Flow custom node for canvas timeline blocks.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Clock } from "lucide-react";
import { cn } from "@shared/types/utils";
import type { RFTimelineNodeData } from "../../../types/reactFlow.types";

const HANDLE_CLASS =
  "h-2! w-2! border-border! bg-surface! opacity-0 transition-opacity hover:opacity-100";

function TimelineNodeInner({ data }: NodeProps<RFTimelineNodeData>) {
  const tint = data.color ?? "var(--accent-bg)";

  return (
    <>
      <Handle type="target" position={Position.Left} id="left" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={HANDLE_CLASS} />

      <div
        className={cn(
          "flex h-full w-full items-center gap-2 overflow-hidden rounded-md border border-border bg-panel px-3 py-2 shadow-sm transition-shadow hover:shadow-panel",
          data.isHeld && "opacity-60",
        )}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: tint }}
          aria-hidden
        >
          <Clock className="h-3 w-3 text-white" />
        </div>
        <span className="truncate text-[12px] font-medium text-fg">
          {data.content || "타임라인"}
        </span>
        {data.isHeld && (
          <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wider text-muted">
            보류
          </span>
        )}
      </div>
    </>
  );
}

export const TimelineNode = memo(TimelineNodeInner);
