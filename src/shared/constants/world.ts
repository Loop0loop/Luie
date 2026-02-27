import type { RelationKind } from "../types";

export const RELATION_COLORS: Record<RelationKind, string> = {
    belongs_to: "#c7d2fe", // indigo-200
    enemy_of: "#fecaca",   // red-200
    causes: "#fed7aa",     // orange-200
    controls: "#e9d5ff",   // purple-200
    located_in: "#bbf7d0", // green-200
    violates: "#fde68a",   // yellow-200
};

export const WORLD_ENTITY_TYPES = [
    "Character",
    "Faction",
    "Event",
    "Place",
    "Concept",
    "Rule",
    "Item",
    "Term",
] as const;
