import { memo, useRef, useEffect } from "react";
import {
  Trash2,
  Maximize2,
  Palette,
  PauseCircle,
  PlayCircle,
  GitCommit,
} from "lucide-react";
import type { NodeProps } from "reactflow";
import { Position, Handle, useReactFlow } from "reactflow";
import { cn } from "@renderer/lib/utils";
import { Button } from "@renderer/components/ui/button";

export type CanvasTimelineBlockData = {
  content: string;
  isHeld: boolean;
  color?: string;
  onChangeColor?: (id: string) => void;
  onDataChange?: (
    id: string,
    patch: Partial<Omit<CanvasTimelineBlockData, "onChangeColor" | "onDataChange" | "onDelete">>
  ) => void;
  onDelete?: (id: string) => void;
};

export const CanvasTimelineBlockNode = memo(
  ({ id, data, selected }: NodeProps<CanvasTimelineBlockData>) => {
    const { content = "", isHeld = false, onDataChange, onChangeColor, onDelete } = data;
    const reactFlow = useReactFlow();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleZoom = () => {
      const node = reactFlow.getNode(id);
      if (!node) return;
      void reactFlow.fitBounds(
        {
          x: node.position.x,
          y: node.position.y,
          width: node.width ?? 220,
          height: node.height ?? 120,
        },
        { padding: 0.45, duration: 220 }
      );
    };

    useEffect(() => {
      if (selected && textareaRef.current && !content) {
        textareaRef.current.focus();
      }
    }, [selected, content]);

    return (
      <div className="relative flex flex-col items-start bg-transparent group/card">
        {selected && (
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center p-1 bg-popover/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center px-1 border-r border-white/5 mr-1">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  onChangeColor?.(id);
                }}
                className="w-8 h-8 text-muted-foreground hover:text-indigo-300 hover:bg-indigo-500/10"
              >
                <Palette className="w-4 h-4" />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation();
                  handleZoom();
                }}
                className="w-8 h-8 text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="w-4 h-4" />
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
                  isHeld ? "text-amber-400 bg-amber-500/10" : "text-muted-foreground"
                )}
              >
                {isHeld ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
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
          </div>
        )}

        <div
          className={cn(
            "relative flex items-center w-[220px] p-4 bg-secondary/40 border-2 rounded-2xl transition-all duration-300 shadow-sm",
            isHeld ? "border-dashed border-white/5 opacity-40 grayscale" : "border-white/5",
            selected
              ? "bg-secondary border-amber-500 ring-4 ring-amber-500/5 shadow-2xl scale-[1.05] z-40"
              : "hover:bg-secondary/60 hover:border-white/10"
          )}
          style={{ backgroundColor: data.color }}
        >
          <div
            className={cn(
              "mr-3.5 flex-shrink-0 p-1.5 rounded-full transition-colors",
              isHeld ? "text-amber-500/40" : "bg-amber-500/10 text-amber-500"
            )}
          >
            {isHeld ? <PauseCircle className="w-4 h-4" /> : <GitCommit className="w-4 h-4" strokeWidth={3} />}
          </div>

          <textarea
            ref={textareaRef}
            value={content}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onDataChange?.(id, { content: e.target.value })}
            placeholder="사건 기록..."
            rows={1}
            className={cn(
              "w-full text-[13px] font-bold bg-transparent outline-none resize-none overflow-hidden text-foreground/90 placeholder:text-foreground/20",
              isHeld && "line-through opacity-50"
            )}
          />
        </div>

        {([
          { position: Position.Top, axis: "top" },
          { position: Position.Bottom, axis: "bottom" },
          { position: Position.Left, axis: "left" },
          { position: Position.Right, axis: "right" },
        ] as const).map(({ position, axis }) => (
          <span key={`${id}-${axis}-handles`}>
            <Handle
              id={`${axis}-source`}
              type="source"
              position={position}
              className={cn(
                "!h-2.5 !w-2.5 !border-0 transition-opacity bg-amber-500",
                selected
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto"
              )}
            />
            <Handle
              id={`${axis}-target`}
              type="target"
              position={position}
              className={cn(
                "!h-2.5 !w-2.5 !border-0 transition-opacity bg-amber-500",
                selected
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 group-hover/card:opacity-100 pointer-events-none group-hover/card:pointer-events-auto"
              )}
            />
          </span>
        ))}
      </div>
    );
  }
);

CanvasTimelineBlockNode.displayName = "CanvasTimelineBlockNode";
