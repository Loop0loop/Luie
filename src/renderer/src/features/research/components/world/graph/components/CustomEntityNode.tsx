import { memo, useState, useEffect } from "react";
import type { KeyboardEvent } from "react";
import { Handle, Position, NodeToolbar, useReactFlow } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldEntitySourceType } from "@shared/types";
import { Trash2, Palette, Edit2, Maximize2 } from "lucide-react";
import { Button } from "@renderer/components/ui/button";

interface CustomEntityNodeProps {
  id: string;
  data: {
    label: string;
    entityType: string;
    color?: string;
    description?: string | null;
    onDelete?: (id: string) => void;
    onChangeColor?: (id: string) => void;
    onZoom?: (id: string) => void;
  };
  selected?: boolean;
}

/**
 * Custom Entity Node - Boardmix/Obsidian Inspired
 * A minimalist card for all world entities.
 */
export const CustomEntityNode = memo(
  ({ id, data, selected }: CustomEntityNodeProps) => {
    const { label, entityType, description, onDelete, onChangeColor, onZoom } =
      data;
    const reactFlow = useReactFlow();
    const updateGraphNode = useWorldBuildingStore(
      (state) => state.updateGraphNode,
    );

    const [isEditing, setIsEditing] = useState(false);
    const [editLabel, setEditLabel] = useState(label);

    useEffect(() => setEditLabel(label), [label]);

    const handleSave = () => {
      setIsEditing(false);
      if (editLabel !== label) {
        void updateGraphNode({
          id,
          entityType: entityType as WorldEntitySourceType,
          name: editLabel,
        });
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
      <div
        className={cn(
          "group relative flex flex-col min-w-[200px] max-w-[320px] rounded-2xl border bg-secondary/40 backdrop-blur-xl shadow-sm transition-all duration-300",
          selected
            ? "border-amber-500 ring-4 ring-amber-500/5 shadow-2xl scale-[1.02]"
            : "border-white/5 hover:border-white/10",
        )}
        style={{
          backgroundColor: data.color ?? "rgba(20,24,30,0.9)",
        }}
      >
        <NodeToolbar isVisible={selected} position={Position.Top} offset={12}>
          <div className="flex gap-1 p-1 rounded-xl border border-white/10 bg-popover/95 shadow-2xl backdrop-blur-md">
            {[
              { icon: Maximize2, title: "Zoom", onClick: onZoom },
              { icon: Palette, title: "Color", onClick: onChangeColor },
              {
                icon: Edit2,
                title: "Rename",
                onClick: () => setIsEditing(true),
              },
              {
                icon: Trash2,
                title: "Delete",
                onClick: onDelete,
                color: "hover:text-destructive hover:bg-destructive/10",
              },
            ].map((action, i) => (
              <Button
                key={i}
                size="icon-xs"
                variant="ghost"
                className={cn("h-8 w-8 text-muted-foreground", action.color)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (action.icon === Maximize2) {
                    const node = reactFlow.getNode(id);
                    if (!node) return;
                    void reactFlow.fitBounds(
                      {
                        x: node.position.x,
                        y: node.position.y,
                        width: node.width ?? 260,
                        height: node.height ?? 160,
                      },
                      { padding: 0.45, duration: 220 },
                    );
                    return;
                  }
                  action.onClick?.(id);
                }}
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
            <div
              className="text-[15px] font-black tracking-tight text-foreground/90 leading-tight break-words cursor-text"
              onDoubleClick={() => setIsEditing(true)}
            >
              {label || "Untitled Entity"}
            </div>
          )}

          {description && (
            <div className="text-[12px] text-muted-foreground leading-relaxed line-clamp-3">
              {description}
            </div>
          )}
        </div>

        {/* Connection Handles - Visible on select or hover */}
        {[
          { id: "t", pos: Position.Top },
          { id: "b", pos: Position.Bottom },
          { id: "l", pos: Position.Left },
          { id: "r", pos: Position.Right },
        ].map((h) => (
          <span key={h.id}>
            <Handle
              type="source"
              position={h.pos}
              id={`${h.id}-source`}
              className={cn(
                "!w-3 !h-3 !bg-amber-500 !border-2 !border-[#1c2128] transition-all hover:!scale-150 hover:!bg-amber-400",
                selected
                  ? "!opacity-100 pointer-events-auto"
                  : "!opacity-0 group-hover:!opacity-100 pointer-events-none group-hover:pointer-events-auto",
              )}
            />
            <Handle
              type="target"
              position={h.pos}
              id={`${h.id}-target`}
              className={cn(
                "!w-3 !h-3 !bg-amber-500 !border-2 !border-[#1c2128] transition-all hover:!scale-150 hover:!bg-amber-400",
                selected
                  ? "!opacity-100 pointer-events-auto"
                  : "!opacity-0 group-hover:!opacity-100 pointer-events-none group-hover:pointer-events-auto",
              )}
            />
          </span>
        ))}
      </div>
    );
  },
);

CustomEntityNode.displayName = "CustomEntityNode";
