import fs from 'fs';

const content = `import { memo, useState, useEffect } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";
import { WORLD_GRAPH_MINIMAP_COLORS } from "@shared/constants/worldGraphUI";

type CustomEntityNodeProps = {
  id: string;
  data: {
    label: string;
    subType: string;
    entityType: string;
    description?: string | null;
  };
  selected?: boolean;
};

export const CustomEntityNode = memo(({ id, data, selected }: CustomEntityNodeProps) => {
  const { label, subType, entityType, description } = data;
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);

  useEffect(() => {
    setEditLabel(label);
  }, [label]);

  const handleSave = () => {
    setIsEditing(false);
    if (editLabel !== label) {
      void updateGraphNode({ id, entityType: entityType as WorldEntitySourceType, name: editLabel });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditLabel(label);
    }
  };

  const accentColor = WORLD_GRAPH_MINIMAP_COLORS[subType] ?? "#94a3b8";

  return (
    <div className={cn(
      "group relative min-w-[200px] max-w-[280px] rounded-lg border bg-background/95 backdrop-blur-md shadow-sm transition-all duration-200 overflow-hidden",
      selected ? "border-accent ring-1 ring-accent/30 shadow-md" : "border-border/50 hover:border-border/80 hover:shadow-md"
    )}>
      <div 
        className="h-1 w-full" 
        style={{ backgroundColor: accentColor }}
      />
      
      <div className="p-3">
        {isEditing ? (
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full text-[14px] font-semibold text-foreground bg-transparent border-b border-accent outline-none pb-0.5"
            placeholder="블럭 이름"
          />
        ) : (
          <div 
            className="text-[14px] font-semibold text-foreground leading-tight break-words"
            onDoubleClick={() => setIsEditing(true)}
          >
            {label || "이름 없는 블럭"}
          </div>
        )}

        {description && (
          <div className="mt-2 text-[12px] leading-relaxed text-muted-foreground/90 line-clamp-3">
            {description}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity !h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity !h-2.5 !w-2.5 !border-2 !border-background !bg-muted-foreground" />
    </div>
  );
});

CustomEntityNode.displayName = "CustomEntityNode";
`;

fs.writeFileSync('/Users/user/Luie/src/renderer/src/features/research/components/world/graph/components/CustomEntityNode.tsx', content);
console.log('writeFileSync completed!');
