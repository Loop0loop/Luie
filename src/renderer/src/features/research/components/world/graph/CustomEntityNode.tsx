import { memo } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@shared/types/utils";
import {
    User,
    Flag,
    AlertCircle,
    BookOpen,
    MapPin,
    Lightbulb,
    Scale,
    Box,
    CircleDashed
} from "lucide-react";
import type { WorldEntitySourceType } from "@shared/types";

// 아이콘 매핑
const ICON_MAP: Record<WorldEntitySourceType | string, React.ElementType> = {
    Character: User,
    Faction: Flag,
    Event: AlertCircle,
    Term: BookOpen,
    Place: MapPin,
    Concept: Lightbulb,
    Rule: Scale,
    Item: Box,
    WorldEntity: CircleDashed,
};

// 파스텔/소프트 톤 색상 매핑
export const NODE_COLORS: Record<WorldEntitySourceType | string, { bg: string; text: string; border: string }> = {
    Character: { bg: "#eef2ff", text: "#4f46e5", border: "#c7d2fe" }, // Indigo
    Faction: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },   // Orange
    Event: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },     // Red
    Term: { bg: "#f0fdfa", text: "#0d9488", border: "#a7f3d0" },      // Teal
    Place: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },     // Green
    Concept: { bg: "#f0f9ff", text: "#0284c7", border: "#bae6fd" },   // Sky
    Rule: { bg: "#faf5ff", text: "#9333ea", border: "#e9d5ff" },      // Purple
    Item: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },      // Amber
    WorldEntity: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },// Slate
};

export const CustomEntityNode = memo(({ data, selected }: any) => {
    const { label, subType, importance = 3 } = data;
    const colorSpec = NODE_COLORS[subType] ?? NODE_COLORS["WorldEntity"];
    const Icon = ICON_MAP[subType] ?? ICON_MAP["WorldEntity"];

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

            {/* 노드 본체 (Pill 형태) */}
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-200",
                    selected ? "ring-2 ring-accent shadow-md scale-105" : "hover:scale-105 hover:shadow-md"
                )}
                style={{
                    backgroundColor: colorSpec.bg,
                    borderColor: colorSpec.border,
                    color: colorSpec.text,
                    transform: `scale(${baseScale})`,
                    transformOrigin: "center center",
                }}
            >
                <div className="flex bg-white/50 p-1 rounded-full shrink-0">
                    <Icon size={14} strokeWidth={2.5} />
                </div>
                <span className="font-semibold text-xs whitespace-nowrap tracking-tight">
                    {label}
                </span>
            </div>
        </>
    );
});

CustomEntityNode.displayName = "CustomEntityNode";
