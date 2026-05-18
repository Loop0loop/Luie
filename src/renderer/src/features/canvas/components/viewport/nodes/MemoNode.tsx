/**
 * MemoNode — React-Flow custom node for canvas memo blocks.
 * Obsidian-style sticky note with optional colour tint and tag chips.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { StickyNote } from "lucide-react";
import type { RFMemoNodeData } from "../../../types/reactFlow.types";

const HANDLE_CLASS =
  "h-2! w-2! border-border! bg-surface! opacity-0 transition-opacity hover:opacity-100";

function MemoNodeInner({ data }: NodeProps<RFMemoNodeData>) {
  const tint = data.color ?? "var(--bg-panel)";

  return (
    <>
      <Handle type="target" position={Position.Top} id="top" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />

      <div
        className="flex min-h-[80px] w-full flex-col overflow-hidden rounded-md border border-border shadow-sm transition-shadow hover:shadow-panel"
        style={{ background: tint }}
      >
        <header className="flex items-center gap-1.5 border-b border-border/40 px-2.5 py-1.5">
          <StickyNote className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-[11px] font-semibold text-fg">
            {data.title || "메모"}
          </span>
        </header>

        {data.body && (
          <p className="line-clamp-3 px-2.5 py-1.5 text-[11px] leading-relaxed text-fg/70">
            {data.body}
          </p>
        )}

        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-2.5 pb-1.5">
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-surface px-1 py-0.5 text-[9px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export const MemoNode = memo(MemoNodeInner);
