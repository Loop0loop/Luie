import { memo } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@shared/types/utils";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_NODE_THEMES } from "@shared/constants/worldGraphUI";

const NODE_CONFIG = {
    SCALE_MULTIPLIER: 0.1,
    BASE_IMPORTANCE: 3,
    DEFAULT_IMPORTANCE: 3,
};

const HANDLE_STYLES =
    "w-2.5 h-2.5 bg-blue-500 border-2 border-white shadow-sm transition-all hover:scale-125 focus:ring-2 focus:ring-blue-500/50 z-10 opacity-0 group-hover:opacity-100 !min-w-[10px] !min-h-[10px]";

type CustomEntityNodeProps = {
    data: {
        label: string;
        subType: string;
        importance?: number;
        viewMode?: "standard" | "protagonist" | "event-chain" | "freeform";
    };
    selected?: boolean;
};

export const CustomEntityNode = memo(({ data, selected }: CustomEntityNodeProps) => {
    const { label, subType, importance = NODE_CONFIG.DEFAULT_IMPORTANCE, viewMode = "standard" } = data;
    const themeSpec = WORLD_GRAPH_NODE_THEMES[subType] ?? WORLD_GRAPH_NODE_THEMES["WorldEntity"];
    const Icon = WORLD_GRAPH_ICON_MAP[subType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];

    const baseScale = 1 + (importance - NODE_CONFIG.BASE_IMPORTANCE) * NODE_CONFIG.SCALE_MULTIPLIER;

    // Mode-specific styles
    const isEventChainFocused = viewMode === "event-chain" && subType === "Event";
    const isProtagonistSelected = viewMode === "protagonist" && selected;
    const isFreeform = viewMode === "freeform";

    return (
        <div className="group relative">
            {/* Obsidian Canvas Style Card */}
            <div
                className={cn(
                    "flex flex-col w-[160px] min-h-[64px] rounded-xl border bg-element/90 backdrop-blur-md shadow-sm transition-all duration-200 ease-out cursor-grab active:cursor-grabbing overflow-hidden",
                    selected ? "border-accent ring-2 ring-accent/30 shadow-md" : "border-border/60 hover:border-accent/50 hover:shadow",
                    isEventChainFocused && "scale-105 shadow-lg",
                    isProtagonistSelected && "ring-4 ring-accent/80 shadow-[0_0_40px_rgba(currentColor,0.4)] scale-105",
                    isFreeform && "border-dashed shadow-[0_10px_30px_rgba(37,99,235,0.10)]"
                )}
                style={{
                    transform: `scale(${baseScale})`,
                    transformOrigin: "center center",
                }}
            >
                {/* File Header Tab */}
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 border-b border-border/40",
                    themeSpec.wrapper // Gives a subtle background tint based on type
                )}>
                    <div className={cn("p-0.5 rounded-sm shrink-0", themeSpec.iconBg, themeSpec.text)}>
                        <Icon size={12} strokeWidth={2.5} />
                    </div>
                    <span className="font-semibold text-[10px] tracking-widest uppercase opacity-70">
                        {subType}
                    </span>
                </div>
                
                {/* File Content Area */}
                <div className="flex-1 p-3 flex items-start">
                    <span className="font-medium text-sm text-fg leading-tight break-keep">
                        {label}
                    </span>
                </div>
            </div>

            {/* Handles rendered after main div for z-index stacking */}
            <Handle
                type="target"
                position={Position.Top}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -mt-1")}
                id="top"
                isConnectable={true}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -mb-1")}
                id="bottom"
                isConnectable={true}
            />
            <Handle
                type="target"
                position={Position.Left}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -ml-1")}
                id="left"
                isConnectable={true}
            />
            <Handle
                type="source"
                position={Position.Right}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -mr-1")}
                id="right"
                isConnectable={true}
            />

        </div>
    );
});

CustomEntityNode.displayName = "CustomEntityNode";
