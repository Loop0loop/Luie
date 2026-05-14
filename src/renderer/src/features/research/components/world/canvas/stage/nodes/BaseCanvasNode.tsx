import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@renderer/lib/utils";
import {
  CANVAS_NODE_ICON,
  CANVAS_NODE_LABEL_KEY,
  CANVAS_NODE_SIZE,
  CANVAS_NODE_TINT,
} from "./nodeConstants";
import type { CanvasNodeData } from "./nodeData";

interface BaseCanvasNodeProps extends NodeProps<CanvasNodeData> {
  /** note 노드 같이 카드 본문이 더 큰 경우 추가 컨텐츠 슬롯 */
  bodySlot?: React.ReactNode;
}

/**
 * 모든 캔버스 노드의 공통 카드 셸 — Obsidian 스타일.
 *
 * 시각:
 *   - 좌측 3px accent 컬러 바 (종류별 tint)
 *   - 헤더: 작은 아이콘 + KIND 라벨 (uppercase, muted)
 *   - 제목: 13px, semibold
 *   - 부제: 11px, muted
 *   - 선택 시 ring + accent 배경
 *   - Derived는 점선 테두리 + 반투명 dim
 *
 * Handles는 4방향 모두 노출하되 시각적으로 거의 안 보이게 (작은 dot).
 */
function BaseCanvasNodeImpl({
  data,
  selected,
  bodySlot,
}: BaseCanvasNodeProps) {
  const { t } = useTranslation();
  const { kind, origin, title, subtitle } = data;
  const tint = CANVAS_NODE_TINT[kind];
  const Icon = CANVAS_NODE_ICON[kind];
  const isDerived = origin === "derived";

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all",
        "hover:shadow-md",
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border/60",
        isDerived && "border-dashed opacity-75",
      )}
      style={{
        minWidth: CANVAS_NODE_SIZE.MIN_WIDTH,
        maxWidth: CANVAS_NODE_SIZE.MAX_WIDTH,
      }}
    >
      {/* 좌측 컬러 바 */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: tint }}
      />

      <div className="flex flex-col gap-1 px-3 py-2 pl-3.5">
        {/* 헤더: 아이콘 + 종류 라벨 */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Icon className="size-3 shrink-0" style={{ color: tint }} />
          <span>{t(CANVAS_NODE_LABEL_KEY[kind])}</span>
          {isDerived ? (
            <span className="ml-auto rounded-sm bg-muted px-1 py-px text-[9px] font-medium normal-case tracking-normal text-muted-foreground">
              {t("canvas.node.derived")}
            </span>
          ) : null}
        </div>

        {/* 제목 */}
        <div className="text-[13px] font-semibold leading-tight text-foreground">
          {title}
        </div>

        {/* 부제 */}
        {subtitle ? (
          <div className="truncate text-[11px] leading-tight text-muted-foreground">
            {subtitle}
          </div>
        ) : null}

        {/* 추가 본문 (note 등) */}
        {bodySlot}
      </div>

      {/* 4방향 Handle — 시각적으로 작은 dot */}
      <Handle
        type="target"
        position={Position.Top}
        className="size-1.5! border! border-border! bg-background!"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="size-1.5! border! border-border! bg-background!"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="size-1.5! border! border-border! bg-background!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="size-1.5! border! border-border! bg-background!"
      />
    </div>
  );
}

export const BaseCanvasNode = memo(BaseCanvasNodeImpl);
