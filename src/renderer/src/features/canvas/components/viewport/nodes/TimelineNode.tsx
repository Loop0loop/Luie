/**
 * TimelineNode — Obsidian Canvas 스타일 타임라인 블록 노드.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@shared/types/utils";
import type { RFTimelineNodeData } from "../../../types/reactFlow.types";
import { CANVAS_HANDLE_CLASS, CANVAS_NODE_SHADOW_CLASS } from "../../../constants";

function TimelineNodeInner({ data }: NodeProps<RFTimelineNodeData>) {
  const { t } = useTranslation();
  const accentColour = data.color ?? "var(--accent-bg)";

  return (
    <div className="group relative h-full w-full">
      <Handle type="target" position={Position.Left}  id="left"  className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={CANVAS_HANDLE_CLASS} />

      <div
        className={cn(
          `flex h-full w-full items-center gap-3 overflow-hidden rounded-lg border border-border bg-panel px-3 py-2.5 transition-shadow ${CANVAS_NODE_SHADOW_CLASS}`,
          data.isHeld && "opacity-50",
        )}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: accentColour }}
          aria-hidden
        >
          <Clock className="h-3.5 w-3.5 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-fg">
            {data.content || t("canvas.node.fallbackTimeline")}
          </span>
          {data.isHeld && (
            <span className="text-[10px] uppercase tracking-wider text-muted">
              {t("canvas.node.held")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export const TimelineNode = memo(TimelineNodeInner);
