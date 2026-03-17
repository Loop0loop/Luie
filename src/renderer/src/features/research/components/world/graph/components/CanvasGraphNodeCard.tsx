import { memo } from "react";
import { Edit2, Palette, Search, Trash2 } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position, NodeToolbar } from "reactflow";
import { Button } from "@renderer/components/ui/button";
import { ENTITY_TYPE_CANVAS_THEME } from "../constants";

export type CanvasGraphNodeData = {
  label: string;
  entityType: string;
  description: string;
  relationCount?: number;
  metaLabel?: string;
  subType?: string;
  date?: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onChangeColor?: (id: string) => void;
  onOpenEntity?: (id: string) => void;
  onAddBranch?: (id: string) => void;
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

  return (
    <div className="group relative cursor-grab active:cursor-grabbing">
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#11151c]/95 p-1 shadow-xl backdrop-blur-md">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onChangeColor?.(id);
            }}
            title="색 변경"
          >
            <Palette className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenEntity?.(id);
            }}
            title="엔티티"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-7 w-7 rounded-md text-fg/60 hover:bg-white/8 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.(id);
            }}
            title="수정"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </NodeToolbar>

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-2 !w-2 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: theme.handle }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-2 !w-2 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: theme.handle }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-2 !w-2 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: theme.handle }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2 !w-2 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: theme.handle }}
      />

      <div
        className="flex min-w-[190px] max-w-[300px] flex-col gap-1 rounded-xl border px-5 py-3.5 transition-all"
        style={{
          background: selected
            ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.025)",
          borderColor: selected ? theme.accent : "rgba(255,255,255,0.12)",
          boxShadow: selected
            ? `0 0 0 1px ${theme.accent}22, 0 8px 24px rgba(0,0,0,0.28)`
            : `0 2px 8px rgba(0,0,0,0.18)`,
        }}
      >
        {data.metaLabel && (
          <span
            className="text-[10px] font-medium uppercase tracking-[0.18em]"
            style={{ color: theme.accent, opacity: 0.72 }}
          >
            {data.metaLabel}
          </span>
        )}
        <span className="text-[14px] font-semibold leading-snug text-fg/92">
          {data.label}
        </span>
        {data.relationCount > 0 && (
          <span className="mt-0.5 self-start rounded-full border border-white/8 px-1.5 py-px text-[10px] text-fg/38">
            {data.relationCount} links
          </span>
        )}
      </div>
    </div>
  );
}

export const CanvasGraphNodeCard = memo(CanvasGraphNodeCardInner);
