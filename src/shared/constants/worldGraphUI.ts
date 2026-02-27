import {
    User,
    Flag,
    AlertCircle,
    BookOpen,
    MapPin,
    Lightbulb,
    Scale,
    Box,
    CircleDashed,
    type LucideIcon,
} from "lucide-react";
import type { WorldEntitySourceType } from "@shared/types";

export const WORLD_GRAPH_FALLBACK_COLUMNS = 4;
export const WORLD_GRAPH_FALLBACK_X_STEP_PX = 280;
export const WORLD_GRAPH_FALLBACK_Y_STEP_PX = 180;
export const WORLD_GRAPH_CREATE_MENU_WIDTH_PX = 220;
export const WORLD_GRAPH_CREATE_MENU_HEIGHT_PX = 340;
export const WORLD_GRAPH_NODE_MENU_WIDTH_PX = 180;
export const WORLD_GRAPH_NODE_MENU_HEIGHT_PX = 110;
export const WORLD_GRAPH_MENU_MARGIN_PX = 8;

// 아이콘 매핑
export const WORLD_GRAPH_ICON_MAP: Record<WorldEntitySourceType | string, LucideIcon> = {
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

// 프리미엄 다이나믹 테마 (Tailwind 기반)
export const WORLD_GRAPH_NODE_THEMES: Record<WorldEntitySourceType | string, { wrapper: string; iconBg: string; text: string }> = {
    Character: { wrapper: "bg-panel border-border", iconBg: "bg-indigo-500/15", text: "text-fg" },
    Faction: { wrapper: "bg-panel border-border", iconBg: "bg-orange-500/15", text: "text-fg" },
    Event: { wrapper: "bg-panel border-border", iconBg: "bg-rose-500/15", text: "text-fg" },
    Term: { wrapper: "bg-panel border-border", iconBg: "bg-teal-500/15", text: "text-fg" },
    Place: { wrapper: "bg-panel border-border", iconBg: "bg-emerald-500/15", text: "text-fg" },
    Concept: { wrapper: "bg-panel border-border", iconBg: "bg-sky-500/15", text: "text-fg" },
    Rule: { wrapper: "bg-panel border-border", iconBg: "bg-purple-500/15", text: "text-fg" },
    Item: { wrapper: "bg-panel border-border", iconBg: "bg-amber-500/15", text: "text-fg" },
    WorldEntity: { wrapper: "bg-panel border-border", iconBg: "bg-slate-500/20", text: "text-fg" },
};

// 미니맵용 단순 색상 매핑
export const WORLD_GRAPH_MINIMAP_COLORS: Record<WorldEntitySourceType | string, string> = {
    Character: "#818cf8", // indigo-400
    Faction: "#fb923c",   // orange-400
    Event: "#fb7185",     // rose-400
    Term: "#2dd4bf",      // teal-400
    Place: "#34d399",     // emerald-400
    Concept: "#38bdf8",   // sky-400
    Rule: "#c084fc",      // purple-400
    Item: "#fbbf24",      // amber-400
    WorldEntity: "#94a3b8",// slate-400
};
