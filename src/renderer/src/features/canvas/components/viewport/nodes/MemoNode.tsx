/**
 * MemoNode — Obsidian Canvas 스타일 메모 블록 노드.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { StickyNote } from "lucide-react";
import type { RFMemoNodeData } from "../../../types/reactFlow.types";
import { CANVAS_HANDLE_CLASS, CANVAS_NODE_SHADOW_CLASS } from "../../../constants";

function MemoNodeInner({ data }: NodeProps<RFMemoNodeData>) {
  const { t } = useTranslation();
  const tint = data.color ?? "var(--bg-panel)";

  return (
    <div className="group relative h-full w-full">
      <Handle type="target" position={Position.Top}    id="top"    className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={CANVAS_HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}   id="left"   className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right}  id="right"  className={CANVAS_HANDLE_CLASS} />

      <div
        className={`flex min-h-[90px] w-full flex-col overflow-hidden rounded-lg border border-border transition-shadow ${CANVAS_NODE_SHADOW_CLASS}`}
        style={{ background: tint }}
      >
        <header className="flex items-center gap-1.5 border-b border-border/30 px-3 py-2">
          <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-[12px] font-semibold text-fg">
            {data.title || t("canvas.node.fallbackMemo")}
          </span>
        </header>

        {data.body && (
          <p className="line-clamp-3 px-3 py-2 text-[11px] leading-relaxed text-fg/70">
            {data.body}
          </p>
        )}

        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 px-3 pb-2">
            {data.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface/60 px-1.5 py-0.5 text-[9px] text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export const MemoNode = memo(MemoNodeInner);
