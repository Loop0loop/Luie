/**
 * MemoNode — Obsidian Canvas 스타일 메모 블록 노드.
 *
 * 디자인 레퍼런스:
 *   - 배경: 사용자 지정 색상 (기본 var(--bg-panel))
 *   - 테두리: 1px, 색상 tint
 *   - border-radius: 8px
 *   - 상단 헤더: 아이콘 + 제목
 *   - 태그: 작은 pill
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { useTranslation } from "react-i18next";
import { StickyNote } from "lucide-react";
import type { RFMemoNodeData } from "../../../types/reactFlow.types";

const HANDLE_CLASS =
  "h-2.5! w-2.5! rounded-full! border-2! border-panel! bg-accent! opacity-0 transition-opacity duration-150 hover:opacity-100";

function MemoNodeInner({ data }: NodeProps<RFMemoNodeData>) {
  const { t } = useTranslation();
  const tint = data.color ?? "var(--bg-panel)";

  return (
    <div className="group relative h-full w-full">
      <Handle type="target" position={Position.Top}    id="top"    className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_CLASS} />
      <Handle type="target" position={Position.Left}   id="left"   className={HANDLE_CLASS} />
      <Handle type="source" position={Position.Right}  id="right"  className={HANDLE_CLASS} />

      <div
        className="flex min-h-[90px] w-full flex-col overflow-hidden rounded-lg border border-border shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
        style={{ background: tint }}
      >
        {/* 헤더 */}
        <header className="flex items-center gap-1.5 border-b border-border/30 px-3 py-2">
          <StickyNote className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-[12px] font-semibold text-fg">
            {data.title || t("canvas.node.fallbackMemo")}
          </span>
        </header>

        {/* 본문 */}
        {data.body && (
          <p className="line-clamp-3 px-3 py-2 text-[11px] leading-relaxed text-fg/70">
            {data.body}
          </p>
        )}

        {/* 태그 */}
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
