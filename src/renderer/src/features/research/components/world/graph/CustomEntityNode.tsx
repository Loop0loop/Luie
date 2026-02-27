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
    "w-2.5 h-2.5 bg-accent border-[1.5px] border-panel shadow-sm transition-all hover:scale-125 focus:ring-2 focus:ring-accent/50";

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
            <Handle
                type="target"
                position={Position.Top}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -mt-1")}
                id="top"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -mb-1")}
                id="bottom"
            />
            <Handle
                type="target"
                position={Position.Left}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -ml-1")}
                id="left"
            />
            <Handle
                type="source"
                position={Position.Right}
                className={cn(HANDLE_STYLES, "opacity-0 group-hover:opacity-100 -mr-1")}
                id="right"
            />

            {/* 노드 본체 (Pill 형태) - Glassmorphism UI */}
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-md transition-all duration-300 ease-out",
                    themeSpec.wrapper,
                    selected ? "ring-2 ring-accent ring-offset-1 ring-offset-app shadow-md scale-105" : "hover:-translate-y-0.5 hover:shadow-md"
                )}
                style={{
                    transform: `scale(${baseScale})`,
                    transformOrigin: "center center",
                }}
            >
                <div className={cn("flex items-center justify-center p-1 rounded-full shrink-0 transition-colors", themeSpec.iconBg, themeSpec.text)}>
                    <Icon size={14} strokeWidth={2.5} />
                </div>
                <span className={cn("font-[600] text-[12.5px] whitespace-nowrap tracking-tight pr-1", themeSpec.text)}>
                    {label}
                </span>
            </div>
        </div>
    );
});

CustomEntityNode.displayName = "CustomEntityNode";
