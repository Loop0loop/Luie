import { memo } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@shared/types/utils";
import { WORLD_GRAPH_ICON_MAP, WORLD_GRAPH_NODE_THEMES } from "@shared/constants/worldGraphUI";

type CustomEntityNodeProps = {
    data: {
        label: string;
        subType: string;
        importance?: number;
    };
    selected?: boolean;
};

export const CustomEntityNode = memo(({ data, selected }: CustomEntityNodeProps) => {
    const { label, subType, importance = 3 } = data;
    const themeSpec = WORLD_GRAPH_NODE_THEMES[subType] ?? WORLD_GRAPH_NODE_THEMES["WorldEntity"];
    const Icon = WORLD_GRAPH_ICON_MAP[subType] ?? WORLD_GRAPH_ICON_MAP["WorldEntity"];

    // 중요도에 따른 약간의 크기/폰트 조절 (선택 사항)
    const baseScale = 1 + (importance - 3) * 0.1; // 3이 중간

    return (
        <>
            <Handle
                type="target"
                position={Position.Top}
                className="w-2 h-2 !opacity-0"
                id="top"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="w-2 h-2 !opacity-0"
                id="bottom"
            />
            <Handle
                type="target"
                position={Position.Left}
                className="w-2 h-2 !opacity-0"
                id="left"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="w-2 h-2 !opacity-0"
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
        </>
    );
});

CustomEntityNode.displayName = "CustomEntityNode";
