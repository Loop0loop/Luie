import { memo, useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  Palette,
  PauseCircle,
  PlayCircle,
  GitCommit,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
} from "lucide-react";
import type { NodeProps } from "reactflow";
import { Position, Handle, NodeToolbar } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { Button } from "@renderer/components/ui/button";
import { ENTITY_TYPE_CANVAS_THEME } from "../shared/constants";
import { CANVAS_EDGE_COLORS } from "../utils/canvasFlowUtils";

export type CanvasTimelineBlockData = {
  content: string;
  isHeld: boolean;
  color?: string;
  onChangeColor?: (id: string) => void;
  onDataChange?: (
    id: string,
    patch: Partial<
      Omit<
        CanvasTimelineBlockData,
        "onChangeColor" | "onDataChange" | "onDelete" | "onAddBranch"
      >
    >,
  ) => void;
  onDelete?: (id: string) => void;
  onAddBranch?: (
    id: string,
    direction: "up" | "down" | "left" | "right",
  ) => void;
};

export const CanvasTimelineBlockNode = memo(
  ({ id, data, selected }: NodeProps<CanvasTimelineBlockData>) => {
    const { t } = useTranslation();
    const {
      content = "",
      isHeld = false,
      onDataChange,
      onDelete,
    } = data;
    const eventTheme = ENTITY_TYPE_CANVAS_THEME.Event;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [paletteOpen, setPaletteOpen] = useState(false);

    useEffect(() => {
      if (selected && textareaRef.current && !content) {
        textareaRef.current.focus();
      }
    }, [selected, content]);

    return (
      <div className="relative flex flex-col items-start bg-transparent group/card">
        <NodeToolbar
          isVisible={selected}
          position={Position.Top}
          offset={8}
          className="flex items-center p-1 bg-popover/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg z-50"
        >
          <div className="flex items-center px-1 border-r border-white/5 mr-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                data.onAddBranch?.(id, "up");
              }}
              className="w-8 h-8 text-muted-foreground hover:bg-accent/10 hover:text-accent"
              title={t("research.graph.canvas.timelineBlock.branchUp")}
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                data.onAddBranch?.(id, "down");
              }}
              className="w-8 h-8 text-muted-foreground hover:bg-accent/10 hover:text-accent"
              title={t("research.graph.canvas.timelineBlock.branchDown")}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center px-1 border-r border-white/5 mr-1">
            <div className="relative">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  setPaletteOpen((p) => !p);
                }}
                className={cn(
                  "w-8 h-8 hover:bg-accent/10 hover:text-accent",
                  paletteOpen ? "bg-accent/10 text-accent" : "text-muted-foreground"
                )}
              >
                <Palette className="w-4 h-4" />
              </Button>
              {paletteOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex gap-1 bg-popover/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95">
                  {CANVAS_EDGE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="w-5 h-5 rounded-full border border-black/20 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDataChange?.(id, { color: c });
                        setPaletteOpen(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                textareaRef.current?.focus();
              }}
              className="w-8 h-8 text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center px-1 border-r border-white/5 mr-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onDataChange?.(id, { isHeld: !isHeld });
              }}
              className={cn(
                "w-8 h-8",
                isHeld ? "bg-secondary text-fg/70" : "text-muted-foreground",
              )}
            >
              {isHeld ? (
                <PlayCircle className="w-4 h-4" />
              ) : (
                <PauseCircle className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center pl-1">
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(id);
              }}
              className="w-8 h-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </NodeToolbar>

        <div
          className={cn(
            "relative flex items-center w-[220px] p-4 bg-secondary/40 border-2 rounded-2xl transition-all duration-300 shadow-sm",
            isHeld
              ? "border-dashed border-white/5 opacity-40 grayscale"
              : "border-white/5",
            selected
              ? "bg-secondary ring-4 shadow-2xl scale-[1.05] z-40"
              : "hover:bg-secondary/60 hover:border-white/10",
          )}
          style={{
            backgroundColor: data.color ?? eventTheme.surface,
            ...(selected
              ? {
                borderColor: eventTheme.accent,
                boxShadow: `0 0 0 1px ${eventTheme.accent}22, 0 0 0 4px ${eventTheme.glow}, 0 20px 32px rgba(0,0,0,0.32)`,
              }
              : null),
          }}
        >
          <div
            className={cn(
              "mr-3.5 flex-shrink-0 p-1.5 rounded-full transition-colors",
              isHeld ? "text-fg/45" : "text-fg/85",
            )}
            style={isHeld ? undefined : { backgroundColor: eventTheme.glow }}
          >
            {isHeld ? (
              <PauseCircle className="w-4 h-4" />
            ) : (
              <GitCommit className="w-4 h-4" strokeWidth={3} />
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onDataChange?.(id, { content: e.target.value })}
            placeholder={t("research.graph.canvas.timelineBlock.placeholder")}
            rows={1}
            className={cn(
              "w-full text-[13px] font-bold bg-transparent outline-none resize-none overflow-hidden text-foreground/90 placeholder:text-foreground/20",
              isHeld && "line-through opacity-50",
            )}
          />

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddBranch?.(id, "right");
            }}
            className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-surface text-muted opacity-0 shadow-sm transition-opacity hover:bg-surface-hover hover:text-fg group-hover/card:opacity-100 z-10"
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              data.onAddBranch?.(id, "left");
            }}
            className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-surface text-muted opacity-0 shadow-sm transition-opacity hover:bg-surface-hover hover:text-fg group-hover/card:opacity-100 z-10"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {(
          [
            { position: Position.Top, axis: "top" },
            { position: Position.Bottom, axis: "bottom" },
            { position: Position.Left, axis: "left" },
            { position: Position.Right, axis: "right" },
          ] as const
        ).map(({ position, axis }) => (
          <span key={`${id}-${axis}-handles`}>
            <Handle
              id={`${axis}-out`}
              type="source"
              position={position}
              className={cn(
                "!h-3 !w-3 !border-0 transition-all",
                selected
                  ? "opacity-100 pointer-events-auto scale-110 shadow-sm"
                  : "opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto",
              )}
              style={{ backgroundColor: eventTheme.handle }}
            />
            <Handle
              id={`${axis}-in`}
              type="target"
              position={position}
              className={cn(
                "!h-3 !w-3 !border-0 transition-all",
                selected
                  ? "opacity-100 pointer-events-auto scale-110 shadow-sm"
                  : "opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto",
              )}
              style={{ backgroundColor: eventTheme.handle }}
            />
          </span>
        ))}
      </div>
    );
  },
);

CanvasTimelineBlockNode.displayName = "CanvasTimelineBlockNode";
