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
    Character: { wrapper: "bg-indigo-50/95 dark:bg-indigo-950/80 border-indigo-200/60 dark:border-indigo-800/60 shadow-indigo-500/10", iconBg: "bg-indigo-100 dark:bg-indigo-900/60", text: "text-indigo-700 dark:text-indigo-300" },
    Faction: { wrapper: "bg-orange-50/95 dark:bg-orange-950/80 border-orange-200/60 dark:border-orange-800/60 shadow-orange-500/10", iconBg: "bg-orange-100 dark:bg-orange-900/60", text: "text-orange-700 dark:text-orange-300" },
    Event: { wrapper: "bg-rose-50/95 dark:bg-rose-950/80 border-rose-200/60 dark:border-rose-800/60 shadow-rose-500/10", iconBg: "bg-rose-100 dark:bg-rose-900/60", text: "text-rose-700 dark:text-rose-300" },
    Term: { wrapper: "bg-teal-50/95 dark:bg-teal-950/80 border-teal-200/60 dark:border-teal-800/60 shadow-teal-500/10", iconBg: "bg-teal-100 dark:bg-teal-900/60", text: "text-teal-700 dark:text-teal-300" },
    Place: { wrapper: "bg-emerald-50/95 dark:bg-emerald-950/80 border-emerald-200/60 dark:border-emerald-800/60 shadow-emerald-500/10", iconBg: "bg-emerald-100 dark:bg-emerald-900/60", text: "text-emerald-700 dark:text-emerald-300" },
    Concept: { wrapper: "bg-sky-50/95 dark:bg-sky-950/80 border-sky-200/60 dark:border-sky-800/60 shadow-sky-500/10", iconBg: "bg-sky-100 dark:bg-sky-900/60", text: "text-sky-700 dark:text-sky-300" },
    Rule: { wrapper: "bg-purple-50/95 dark:bg-purple-950/80 border-purple-200/60 dark:border-purple-800/60 shadow-purple-500/10", iconBg: "bg-purple-100 dark:bg-purple-900/60", text: "text-purple-700 dark:text-purple-300" },
    Item: { wrapper: "bg-amber-50/95 dark:bg-amber-950/80 border-amber-200/60 dark:border-amber-800/60 shadow-amber-500/10", iconBg: "bg-amber-100 dark:bg-amber-900/60", text: "text-amber-700 dark:text-amber-300" },
    WorldEntity: { wrapper: "bg-slate-50/95 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800/60 shadow-slate-500/10", iconBg: "bg-slate-100 dark:bg-slate-800/60", text: "text-slate-700 dark:text-slate-300" },
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
