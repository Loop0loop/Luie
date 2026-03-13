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
    entityType,
    description,
    firstAppearance,
    tags,
  } = data;

  const Icon = WORLD_GRAPH_ICON_MAP[subType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];
  const accent = WORLD_GRAPH_MINIMAP_COLORS[subType] ?? "#94a3b8";

  const hasFooter = firstAppearance || (tags && tags.length > 0);

  // styled handle class - minimal dots for block look
  const handleCls =
    "!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-muted-foreground/30 !shadow-sm transition-all opacity-0 group-hover:opacity-100 hover:!bg-accent hover:!scale-125";

  // Character UI: User icon, perhaps a placeholder for portrait, simple stats look
  const renderCharacter = () => (
    <div className="flex items-start gap-3 p-3">
      <div className="mt-0.5 shrink-0 rounded-full h-8 w-8 flex items-center justify-center border border-border/50 shadow-inner overflow-hidden" style={{ backgroundColor: `${accent}15` }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[13px] font-bold tracking-tight leading-none text-foreground break-words pb-0.5">
          {label}
        </span>
        <div className="flex items-center gap-1.5 opacity-80">
          <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: accent }}>{subType}</span>
          {tags?.slice(0, 1).map((tag) => (
            <span key={tag} className="text-[9px] text-muted-foreground">· {tag}</span>
          ))}
        </div>
        {description && (
          <span className="text-[11px] leading-snug text-muted-foreground line-clamp-2 mt-1 border-l-2 pl-2 border-border/60">
            {description}
          </span>
        )}
      </div>
    </div>
  );

  // Event UI: Date focus, timeline aesthetic
  const renderEvent = () => (
    <div className="flex flex-col p-3 gap-2">
      <div className="flex justify-between items-start gap-2">
        <span className="text-[13px] font-semibold leading-tight text-foreground break-words flex-1">
          {label}
        </span>
        <div className="shrink-0 rounded px-1.5 py-0.5 pb-px border border-border/40" style={{ backgroundColor: `${accent}10`, color: accent }}>
          <span className="text-[9px] font-bold uppercase tracking-widest">{subType}</span>
        </div>
      </div>
      {firstAppearance && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-medium">
          <Icon size={12} />
          <span>{firstAppearance}</span>
        </div>
      )}
      {description && (
        <span className="text-[11px] leading-snug text-muted-foreground line-clamp-2 mt-0.5">
          {description}
        </span>
      )}
    </div>
  );

  // Concept/Place/Default UI: Hierarchical or academic look
  const renderDefault = () => (
    <div className="flex items-start gap-2.5 p-3">
      <div className="mt-0.5 shrink-0">
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium leading-none text-foreground break-words">
            {label}
          </span>
          <span className="text-[8px] font-mono border rounded px-1 bg-muted/40 text-muted-foreground opacity-70 uppercase">
            {subType}
          </span>
        </div>
        {description && (
          <span className="text-[11px] leading-snug text-muted-foreground line-clamp-2 mt-1">
            {description}
          </span>
        )}
        
        {hasFooter && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-background border border-border/40 px-1 py-0.5 text-[9px] font-medium text-muted-foreground/80"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (entityType) {
      case "Character": return renderCharacter();
      case "Event": return renderEvent();
      default: return renderDefault();
    }
  };

  return (
    <div className="group relative">
      <div
        className={cn(
          "flex min-w-[170px] max-w-[280px] flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
          selected
            ? "border-accent ring-1 ring-accent/20 shadow-md"
            : "border-border hover:border-border-hover/80 hover:shadow-md"
        )}
        style={selected ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}30, 0 4px 12px ${accent}10` } : {}}
      >
        {renderContent()}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={handleCls}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={handleCls}
        isConnectable
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={handleCls}
        isConnectable
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={handleCls}
        isConnectable
      />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
