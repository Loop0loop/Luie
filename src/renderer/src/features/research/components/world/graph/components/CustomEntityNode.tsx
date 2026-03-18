import { memo, useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Handle, Position, NodeToolbar } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";
import { Trash2, Search, Edit2 } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

interface CustomEntityNodeProps {
  id: string;
  data: {
    label: string;
    entityType: string;
    description?: string | null;
    onDelete?: (id: string) => void;
    onOpenEntity?: (id: string) => void;
  };
  selected?: boolean;
}

/**
 * Custom Entity Node - Boardmix/Obsidian Inspired
 * A minimalist card for all world entities.
 */
export const CustomEntityNode = memo(({ id, data, selected }: CustomEntityNodeProps) => {
  const { label, entityType, description, onDelete, onOpenEntity } = data;
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);

  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  useEffect(() => setEditLabel(label), [label]);

  const handleSave = () => {
    setIsEditing(false);
    if (editLabel !== label) {
      void updateGraphNode({ id, entityType: entityType as WorldEntitySourceType, name: editLabel });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") {
      setIsEditing(false);
      setEditLabel(label);
    }
  };

  return (
    <div className={cn(
      "group relative flex flex-col min-w-[200px] max-w-[320px] rounded-2xl border bg-secondary/40 backdrop-blur-xl shadow-sm transition-all duration-300",
      selected ? "border-amber-500 ring-4 ring-amber-500/5 bg-secondary shadow-2xl scale-[1.02]" : "border-white/5 hover:border-white/10 hover:bg-secondary/60"
    )}>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={12}>
        <div className="flex gap-1 p-1 rounded-xl border border-white/10 bg-popover/95 shadow-2xl backdrop-blur-md">
          {[
            { icon: Search, title: "View Details", onClick: onOpenEntity },
            { icon: Edit2, title: "Rename", onClick: () => setIsEditing(true) },
            { icon: Trash2, title: "Delete", onClick: onDelete, color: "hover:text-destructive hover:bg-destructive/10" }
          ].map((action, i) => (
            <Button
              key={i}
              size="icon-xs"
              variant="ghost"
              className={cn("h-8 w-8 text-muted-foreground", action.color)}
              onClick={(e) => { e.stopPropagation(); action.onClick?.(id); }}
              title={action.title}
            >
              <action.icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </NodeToolbar>

      <div className="p-5 space-y-2">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[15px] font-black tracking-tight text-foreground outline-none border-b-2 border-amber-500 pb-1"
          />
        ) : (
          <div className="text-[15px] font-black tracking-tight text-foreground/90 leading-tight break-words cursor-text" onDoubleClick={() => setIsEditing(true)}>
            {label || "Untitled Entity"}
          </div>
        )}
        
        {description && (
          <div className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
            {description}
          </div>
        )}
      </div>

      {/* Connection Handles - Minimalist Style */}
      <Handle type="target" position={Position.Top} className="!opacity-0 group-hover:!opacity-100 !bg-amber-500 !border-none !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 group-hover:!opacity-100 !bg-amber-500 !border-none !w-2.5 !h-2.5" />
      <Handle type="target" position={Position.Left} id="l" className="!opacity-0 group-hover:!opacity-100 !bg-amber-500 !border-none !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} id="r" className="!opacity-0 group-hover:!opacity-100 !bg-amber-500 !border-none !w-2.5 !h-2.5" />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
