import { memo, useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Handle, Position, NodeToolbar } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";
import { Trash2, Search, Edit2 } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

type CustomEntityNodeProps = {
  id: string;
  data: {
    label: string;
    entityType: string;
    description?: string | null;
    onDelete?: (id: string) => void;
    onOpenEntity?: (id: string) => void;
  };
  selected?: boolean;
};

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
      "group relative flex flex-col min-w-[180px] max-w-[320px] rounded-lg border bg-[#1a1d23] text-fg shadow-sm transition-all duration-200",
      selected ? "border-primary/60 ring-1 ring-primary/30" : "border-white/10 hover:border-white/20"
    )}>
      <NodeToolbar isVisible={selected} position={Position.Top} offset={8}>
        <div className="flex gap-1 rounded-md border border-white/10 bg-[#0b0e13]/95 p-1 shadow-xl backdrop-blur-md">
          {[
            { icon: Search, title: "자세히", onClick: onOpenEntity },
            { icon: Edit2, title: "수정", onClick: () => setIsEditing(true) },
            { icon: Trash2, title: "삭제", onClick: onDelete, color: "hover:text-red-400" }
          ].map((action, i) => (
            <Button
              key={i}
              size="icon-xs"
              variant="ghost"
              className={cn("h-7 w-7 text-fg/50 hover:bg-white/5", action.color)}
              onClick={(e) => { e.stopPropagation(); action.onClick?.(id); }}
              title={action.title}
            >
              <action.icon className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      </NodeToolbar>

      <div className="p-4">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-[14px] font-medium outline-none border-b border-primary/50 pb-0.5"
          />
        ) : (
          <div className="text-[14px] font-medium leading-relaxed break-words cursor-text" onDoubleClick={() => setIsEditing(true)}>
            {label || "Untitled"}
          </div>
        )}
        {description && <div className="mt-2 text-[12px] text-fg/50 line-clamp-3 leading-snug">{description}</div>}
      </div>

      <Handle type="target" position={Position.Top} className="!opacity-0 group-hover:!opacity-100 !bg-primary/50 !border-none !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 group-hover:!opacity-100 !bg-primary/50 !border-none !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="l" className="!opacity-0 group-hover:!opacity-100 !bg-primary/50 !border-none !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="r" className="!opacity-0 group-hover:!opacity-100 !bg-primary/50 !border-none !w-2 !h-2" />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
