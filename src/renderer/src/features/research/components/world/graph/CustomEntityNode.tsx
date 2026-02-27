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
    };
    selected?: boolean;
};

export const CustomEntityNode = memo(({ data, selected }: CustomEntityNodeProps) => {
    const { label, subType, importance = NODE_CONFIG.DEFAULT_IMPORTANCE } = data;
    const themeSpec = WORLD_GRAPH_NODE_THEMES[subType] ?? WORLD_GRAPH_NODE_THEMES["WorldEntity"];
    const Icon = WORLD_GRAPH_ICON_MAP[subType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];

    const baseScale = 1 + (importance - NODE_CONFIG.BASE_IMPORTANCE) * NODE_CONFIG.SCALE_MULTIPLIER;

    return (
        <div className="group relative">
            {/* 노드 본체 (Pill 형태) - Glassmorphism UI */}
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300 ease-out cursor-grab active:cursor-grabbing",
                    themeSpec.wrapper,
                    selected ? "ring-2 ring-accent ring-offset-1 ring-offset-app shadow-md scale-105" : "hover:-translate-y-0.5 hover:shadow-md"
                )}
                style={{
                    transform: `scale(${baseScale})`,
                    transformOrigin: "center center",
                }}
            >
                <div className={cn("flex items-center justify-center p-1 rounded-full shrink-0 transition-colors pointer-events-none", themeSpec.iconBg, themeSpec.text)}>
                    <Icon size={14} strokeWidth={2.5} />
                </div>
                <span className={cn("font-[600] text-[12.5px] whitespace-nowrap tracking-tight pr-1 pointer-events-none", themeSpec.text)}>
                    {label}
                </span>
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
