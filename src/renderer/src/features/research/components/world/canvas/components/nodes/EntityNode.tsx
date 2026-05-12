import { memo } from "react";
import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import type { WorldEntitySourceType } from "@shared/types";
import { GRAPH_ENTITY_BADGE_COLOR_TOKENS } from "../../shared/theme/graphThemeConstants";
import { cn } from "@renderer/lib/utils";

export type EntityNodeData = {
  label: string;
  entityType: WorldEntitySourceType;
  description?: string;
  selected?: boolean;
};

export const EntityNode = memo(function EntityNode({ data, selected }: NodeProps<EntityNodeData>) {
  const colors = GRAPH_ENTITY_BADGE_COLOR_TOKENS[data.entityType] ?? GRAPH_ENTITY_BADGE_COLOR_TOKENS.WorldEntity;

  return (
    <div
      className={cn(
        "group relative min-w-[180px] max-w-[240px] rounded-xl border bg-panel/90 px-3 py-2.5 shadow-md backdrop-blur-sm transition-all duration-150",
        selected
          ? `${colors.card} shadow-lg ring-1 ring-inset ring-white/10`
          : `border-border/40 hover:${colors.card}`,
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-border/60 !bg-element"
      />

      <div className="mb-1.5 flex items-center gap-2">
        <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest", colors.chip)}>
          {data.entityType}
        </span>
      </div>

      <p className="truncate text-[13px] font-semibold text-fg leading-tight">
        {data.label}
      </p>

      {data.description && (
        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">
          {data.description}
        </p>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-border/60 !bg-element"
      />
    </div>
  );
});
