/**
 * EntityNode — Obsidian Canvas 스타일 엔티티 카드 노드.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { getNodeStyle } from "../../../utils/nodeStyles";
import type { RFEntityNodeData } from "../../../types/reactFlow.types";
import {
  CANVAS_HANDLE_CLASS,
  CANVAS_NODE_SHADOW_CLASS,
  CANVAS_NODE_SELECTED_SHADOW_CLASS,
  HEX_ALPHA_20,
} from "../../../constants";

function EntityNodeInner({ data }: NodeProps<RFEntityNodeData>) {
  const { t } = useTranslation();
  const { colour, bgTint } = getNodeStyle(data.kind);

  return (
    <div className="group relative h-full w-full">
      <Handle type="target" position={Position.Top}    id="top"    className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={CANVAS_HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}   id="left"   className={CANVAS_HANDLE_CLASS} />
      <Handle type="source" position={Position.Right}  id="right"  className={CANVAS_HANDLE_CLASS} />

      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-panel border transition-[background-color,border-color,box-shadow] duration-150",
          data.isSelected
            ? `border-accent ${CANVAS_NODE_SELECTED_SHADOW_CLASS}`
            : `border-border ${CANVAS_NODE_SHADOW_CLASS} hover:border-border-active`,
        )}
        style={{ background: bgTint }}
      >
        {/* 상단 컬러 바 */}
        <div
          className="h-[3px] w-full shrink-0"
          style={{ background: colour }}
          aria-hidden
        />

        {/* 콘텐츠 영역 — bg-panel className으로 처리 */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 bg-panel px-3 py-2">
          {/* Kind 배지 */}
          <span
            className="inline-flex w-fit items-center rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
            style={{
              color: colour,
              background: bgTint,
              border: `1px solid ${colour}${HEX_ALPHA_20}`, // 20% opacity
            }}
          >
            {t(`canvas.node.kind.${data.kind}`)}
          </span>

          {/* 레이블 */}
          <span
            className={cn(
              "truncate text-[13px] leading-snug",
              data.isSelected ? "font-semibold text-fg" : "font-medium text-fg/90",
            )}
          >
            {data.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export const EntityNode = memo(EntityNodeInner);
