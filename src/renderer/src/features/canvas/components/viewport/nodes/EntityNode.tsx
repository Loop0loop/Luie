/**
 * EntityNode — React-Flow custom node for world entities.
 *
 * Visual: Obsidian-style card.
 *   - Left colour strip (kind colour from CANVAS_NODE_KIND_COLOUR)
 *   - Kind badge (i18n) + label
 *   - Handles on all four sides (visually hidden until hover)
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { CANVAS_NODE_KIND_COLOUR } from "../../../types";
import type { RFEntityNodeData } from "../../../types/reactFlow.types";

const HANDLE_CLASS =
  "h-2! w-2! border-border! bg-surface! opacity-0 transition-opacity hover:opacity-100";

function EntityNodeInner({ data }: NodeProps<RFEntityNodeData>) {
  const { t } = useTranslation();
  const colour = CANVAS_NODE_KIND_COLOUR[data.kind];

  return (
    <>
      <Handle type="target" position={Position.Top} id="top" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left" className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={HANDLE_CLASS} />

      <div
        className={cn(
          "flex h-full w-full items-stretch overflow-hidden rounded-md border transition-all duration-150",
          data.isSelected
            ? "border-accent bg-panel shadow-[0_0_0_2px_var(--accent-bg)]"
            : "border-border bg-panel hover:border-border-active hover:shadow-panel",
        )}
      >
        <div
          className="w-1 shrink-0"
          style={{ background: colour }}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-2">
          <span
            className="mb-0.5 text-[9px] font-semibold uppercase tracking-widest"
            style={{ color: colour }}
          >
            {t(`canvas.node.kind.${data.kind}`)}
          </span>
          <span
            className={cn(
              "truncate text-[12px] leading-tight",
              data.isSelected
                ? "font-semibold text-fg"
                : "font-medium text-fg/90",
            )}
          >
            {data.label}
          </span>
        </div>
      </div>
    </>
  );
}

export const EntityNode = memo(EntityNodeInner);
