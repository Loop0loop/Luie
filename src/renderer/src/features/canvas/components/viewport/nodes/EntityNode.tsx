/**
 * EntityNode — Obsidian Canvas 스타일 엔티티 카드 노드.
 *
 * 디자인 레퍼런스 (Obsidian Canvas):
 *   - 배경: var(--bg-panel) + kind별 8% tint
 *   - 테두리: 1px solid, kind 색상으로 강조
 *   - border-radius: 8px (Obsidian 기본값)
 *   - 선택 상태: 2px accent glow (box-shadow)
 *   - 상단 컬러 바: 3px, kind 색상
 *   - 핸들: hover 시에만 표시되는 작은 원형 점
 *   - 레이블: 굵은 텍스트, kind 배지는 작은 pill
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { CANVAS_NODE_KIND_COLOUR, CANVAS_NODE_KIND_BG } from "../../../types";
import type { RFEntityNodeData } from "../../../types/reactFlow.types";

// 핸들: hover 시에만 나타나는 작은 원형 점 (Obsidian 스타일)
const HANDLE_CLASS =
  "h-2.5! w-2.5! rounded-full! border-2! border-panel! bg-accent! opacity-0 transition-opacity duration-150 hover:opacity-100 group-hover:opacity-60";

function EntityNodeInner({ data }: NodeProps<RFEntityNodeData>) {
  const { t } = useTranslation();
  const colour = CANVAS_NODE_KIND_COLOUR[data.kind];
  const bgTint = CANVAS_NODE_KIND_BG[data.kind];

  return (
    <div className="group relative h-full w-full">
      {/* 핸들 — 4방향 */}
      <Handle type="target" position={Position.Top}    id="top"    className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}   id="left"   className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right}  id="right"  className={HANDLE_CLASS} />

      {/* 카드 본체 */}
      <div
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-lg border transition-all duration-150",
          data.isSelected
            ? "border-accent shadow-[0_0_0_2px_var(--accent-bg),0_4px_12px_rgba(0,0,0,0.3)]"
            : "border-border shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:border-border-active hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]",
        )}
        style={{ background: bgTint }}
      >
        {/* 상단 컬러 바 (Obsidian 스타일) */}
        <div
          className="h-[3px] w-full shrink-0"
          style={{ background: colour }}
          aria-hidden
        />

        {/* 콘텐츠 영역 */}
        <div
          className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2"
          style={{ background: "var(--bg-panel)" }}
        >
          {/* Kind 배지 */}
          <span
            className="inline-flex w-fit items-center rounded-sm px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
            style={{
              color: colour,
              background: bgTint,
              border: `1px solid ${colour}33`,
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
