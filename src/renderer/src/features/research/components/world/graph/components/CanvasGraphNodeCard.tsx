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
  relationCount: number;
  metaLabel: string;
  subType?: string;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onChangeColor?: (id: string) => void;
  onOpenEntity?: (id: string) => void;
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
    <div className="relative cursor-grab active:cursor-grabbing">
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#11151c]/95 p-1 shadow-xl backdrop-blur-md">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-8 w-8 rounded-md text-fg/70 hover:bg-white/10 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.(id);
            }}
            title="삭제"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-8 w-8 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onChangeColor?.(id);
            }}
            title="색 변경"
          >
            <Palette className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-8 w-8 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onOpenEntity?.(id);
            }}
            title="엔티티"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            className="h-8 w-8 rounded-md text-fg/70 hover:bg-white/10 hover:text-fg"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.(id);
            }}
            title="수정"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      </NodeToolbar>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: theme.handle,
          boxShadow: `0 0 0 3px ${theme.glow}`,
        }}
      />

      <div
        className="flex min-w-[200px] max-w-[320px] items-center justify-center rounded-xl border-[2.5px] px-6 py-4 shadow-lg transition-all"
        style={{
          background: theme.surface,
          borderColor: selected ? theme.accent : "rgba(255,255,255,0.15)",
          boxShadow: selected
            ? `0 0 0 1px ${theme.accent}, 0 12px 24px rgba(0,0,0,0.3)`
            : `0 8px 16px rgba(0,0,0,0.2)`,
        }}
      >
        <span className="text-[15px] font-medium text-fg">{data.label}</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: theme.handle,
          boxShadow: `0 0 0 3px ${theme.glow}`,
        }}
      />
    </div>
  );
}

export const CanvasGraphNodeCard = memo(CanvasGraphNodeCardInner);
