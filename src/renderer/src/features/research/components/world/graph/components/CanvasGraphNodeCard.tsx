import { memo } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { Button } from "@renderer/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@renderer/components/ui/card";
import { ENTITY_TYPE_CANVAS_THEME } from "../constants";

export type CanvasGraphNodeData = {
  label: string;
  entityType: string;
  description: string;
  relationCount: number;
  metaLabel: string;
  subType?: string;
  onDelete?: (id: string) => void;
};

function CanvasGraphNodeCardInner({
  id,
  data,
  selected,
}: NodeProps<CanvasGraphNodeData>) {
  const theme =
    ENTITY_TYPE_CANVAS_THEME[
      data.entityType as keyof typeof ENTITY_TYPE_CANVAS_THEME
    ] ?? ENTITY_TYPE_CANVAS_THEME.WorldEntity;
  const relationLabel =
    data.relationCount === 1 ? "1 link" : `${data.relationCount} links`;

  return (
    <div className="relative cursor-grab active:cursor-grabbing">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-0"
        style={{
          background: theme.handle,
          boxShadow: `0 0 0 3px ${theme.glow}`,
        }}
      />
      <Card
        size="sm"
        className="w-[248px] border text-left backdrop-blur transition-transform"
        style={{
          background: theme.surface,
          borderColor: selected ? theme.accent : "rgba(255,255,255,0.1)",
          boxShadow: selected
            ? `0 0 0 1px ${theme.accent}, 0 24px 48px rgba(0,0,0,0.38)`
            : `inset 0 1px 0 rgba(255,255,255,0.03), 0 18px 36px rgba(0,0,0,0.32)`,
        }}
      >
        <CardHeader className="gap-3 border-b border-white/6 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-fg/42">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: theme.accent, boxShadow: `0 0 10px ${theme.glow}` }}
                />
                <span className="truncate">{data.metaLabel}</span>
              </div>
              <CardTitle className="line-clamp-2 text-[17px] font-semibold text-fg">
                {data.label}
              </CardTitle>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-fg/42">
                {relationLabel}
              </span>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="rounded-full text-fg/48 hover:bg-white/8 hover:text-fg"
                title="엔티티 삭제"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onDelete?.(id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="line-clamp-4 min-h-[72px] text-[13px] leading-6 text-fg/64">
            {data.description || "설명이 아직 없습니다."}
          </p>
          <div className="flex items-center justify-between text-[11px] text-fg/40">
            <span className="truncate">{data.subType || "Canvas"}</span>
            <span className="inline-flex items-center gap-1">
              Open
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-0"
        style={{
          background: theme.handle,
          boxShadow: `0 0 0 3px ${theme.glow}`,
        }}
      />
    </div>
  );
}

export const CanvasGraphNodeCard = memo(CanvasGraphNodeCardInner);
