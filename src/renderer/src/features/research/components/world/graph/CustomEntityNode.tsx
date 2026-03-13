import { memo } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";

type CustomEntityNodeProps = {
  data: {
    label: string;
    subType: string;
    entityType: string;
    importance?: number;
    description?: string | null;
    firstAppearance?: string | null;
    tags?: string[];
  };
  selected?: boolean;
};

export const CustomEntityNode = memo(({ data, selected }: CustomEntityNodeProps) => {
  const {
    label,
    subType,
    importance = 3,
    description,
    firstAppearance,
    tags,
  } = data;

  const Icon = WORLD_GRAPH_ICON_MAP[subType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];
  const accent = WORLD_GRAPH_MINIMAP_COLORS[subType] ?? "#94a3b8";

  const importanceLevel = Math.max(1, Math.min(5, importance));
  const hasFooter = firstAppearance || (tags && tags.length > 0);

  // styled handle class (colored by entity type)
  const handleCls =
    "!h-3 !w-3 !rounded-full !border-2 !border-[var(--bg-element,#1a1a1e)] !shadow-sm transition-all opacity-0 group-hover:opacity-100 hover:!scale-125 hover:opacity-100";

  return (
    <div className="group relative">
      {/* Card */}
      <div
        className={cn(
          "flex w-[220px] flex-col overflow-hidden rounded-xl border bg-element/95 shadow-sm",
          "cursor-grab active:cursor-grabbing transition-all duration-200",
          selected
            ? "shadow-lg"
            : "border-border/40 hover:border-border/70 hover:shadow-md",
        )}
        style={
          selected
            ? {
                borderColor: accent,
                boxShadow: `0 0 0 2px ${accent}35, 0 8px 24px ${accent}18`,
              }
            : undefined
        }
      >
        {/* Accent top strip — entity type color */}
        <div className="h-[3px] w-full shrink-0" style={{ backgroundColor: accent }} />

        {/* Type header */}
        <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
          <Icon size={11} strokeWidth={2.5} style={{ color: accent }} className="shrink-0" />
          <span
            className="text-[9.5px] font-bold tracking-[0.12em] uppercase select-none"
            style={{ color: accent }}
          >
            {subType}
          </span>
          {/* Importance indicator */}
          {importanceLevel >= 5 && (
            <span className="ml-auto select-none text-[9px] text-yellow-400/90">★★★</span>
          )}
          {importanceLevel === 4 && (
            <span className="ml-auto select-none text-[9px] text-yellow-400/70">★★</span>
          )}
        </div>

        {/* Name + Description */}
        <div className="px-3 pb-2.5 pt-0.5">
          <span className="block break-keep text-[13.5px] font-semibold leading-snug text-fg">
            {label}
          </span>
          {description && (
            <span className="mt-1 block line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/65">
              {description}
            </span>
          )}
        </div>

        {/* Footer: firstAppearance + tags */}
        {hasFooter && (
          <div className="flex items-center gap-2 border-t border-border/20 px-3 py-1.5">
            {firstAppearance && (
              <span className="truncate text-[10px] text-muted-foreground/50">
                {firstAppearance}
              </span>
            )}
            {tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full border border-border/30 bg-app/40 px-1.5 py-px text-[9px] text-muted-foreground/55"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Handles — all colored by entity type */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={handleCls}
        style={{ background: accent }}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleCls}
        style={{ background: accent }}
        isConnectable
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleCls}
        style={{ background: accent }}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleCls}
        style={{ background: accent }}
        isConnectable
      />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
