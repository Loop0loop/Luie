/**
 * EntityNode — Obsidian Canvas 스타일 엔티티 카드 노드.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import "@renderer/styles/components/canvas.css";
import { cn } from "@shared/types/utils";
import { getNodeStyle } from "../../../utils/nodeStyles";
import type { RFEntityNodeData } from "../../../types/reactFlow.types";
import {
  CANVAS_HANDLE_CLASS,
  CANVAS_NODE_SHADOW_CLASS,
  CANVAS_NODE_SELECTED_SHADOW_CLASS,
} from "../../../constants";

function EntityNodeInner({ data }: NodeProps<RFEntityNodeData>) {
  const { t } = useTranslation();
  const { colour, bgTint } = getNodeStyle(data.kind);

  return (
    <div className="group relative h-full w-full">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={CANVAS_HANDLE_CLASS}
      />
      <Handle type="source" position={Position.Bottom} id="bottom" className={CANVAS_HANDLE_CLASS} />
      <Handle type="target" position={Position.Left} id="left" className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right} id="right" className={CANVAS_HANDLE_CLASS} />

      <div
        className={cn(
          "canvas-entity-node flex h-full w-full flex-col overflow-hidden rounded-panel border transition-[background-color,border-color,box-shadow] duration-150",
          data.isSelected
            ? `border-accent ${CANVAS_NODE_SELECTED_SHADOW_CLASS}`
            : `border-border ${CANVAS_NODE_SHADOW_CLASS} hover:border-border-active`,
        )}
        style={{ background: bgTint }}
      >
        <div
          className="h-[3px] w-full shrink-0"
          style={{ background: colour }}
          aria-hidden
        />

        <div className="flex min-w-0 flex-1 flex-col bg-panel px-3.5 py-3">
          <div className="flex items-center justify-between gap-2 text-[10px] text-muted">
            <span className="truncate font-medium">{t(`canvas.node.kind.${data.kind}`)}</span>
            <span className="shrink-0">
              {t("canvas.node.connectionCount", "{{count}} 연결", {
                count: data.connectionCount,
              })}
            </span>
          </div>

          <span
            className={cn(
              "mt-2 line-clamp-2 text-[15px] leading-snug",
              data.isSelected ? "font-semibold text-fg" : "font-medium text-fg",
            )}
          >
            {data.label}
          </span>

          {data.description ? (
            <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted">
              {data.description}
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-subtle">
              캔버스 자료 블럭
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeInner);
