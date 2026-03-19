import {
  Boxes,
  Clock3,
  LibraryBig,
  Package2,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { WorldEntitySourceType } from "@shared/types";
import type { GraphCreatePreset, GraphSurfaceTab } from "./types";

export const GRAPH_TAB_ITEMS: Array<{
  id: GraphSurfaceTab;
  labelKey: string;
  descriptionKey: string;
  Icon: LucideIcon;
}> = [
  {
    id: "canvas",
    labelKey: "research.graph.tabs.canvas.label",
    descriptionKey: "research.graph.tabs.canvas.description",
    Icon: Boxes,
  },
  {
    id: "timeline",
    labelKey: "research.graph.tabs.timeline.label",
    descriptionKey: "research.graph.tabs.timeline.description",
    Icon: Clock3,
  },
  {
    id: "notes",
    labelKey: "research.graph.tabs.notes.label",
    descriptionKey: "research.graph.tabs.notes.description",
    Icon: StickyNote,
  },
  {
    id: "entity",
    labelKey: "research.graph.tabs.entity.label",
    descriptionKey: "research.graph.tabs.entity.description",
    Icon: Users,
  },
  {
    id: "library",
    labelKey: "research.graph.tabs.library.label",
    descriptionKey: "research.graph.tabs.library.description",
    Icon: LibraryBig,
  },
];

export const GRAPH_CREATE_PRESETS: GraphCreatePreset[] = [
  {
    entityType: "Character",
    label: "research.graph.presets.addCharacter",
  },
  { entityType: "Event", label: "research.graph.presets.addEvent" },
  {
    entityType: "Place",
    subType: "Place",
    label: "research.graph.presets.addPlace",
  },
  {
    entityType: "Concept",
    subType: "Concept",
    label: "research.graph.presets.addConcept",
  },
];

export const ENTITY_TYPE_COLORS: Record<
  WorldEntitySourceType,
  {
    chip: string;
    card: string;
  }
> = {
  Character: {
    chip: "bg-sky-500/12 text-sky-200 border-sky-400/25",
    card: "border-sky-400/25 bg-sky-500/10",
  },
  Event: {
    chip: "bg-amber-500/12 text-amber-200 border-amber-400/25",
    card: "border-amber-400/25 bg-amber-500/10",
  },
  Faction: {
    chip: "bg-rose-500/12 text-rose-200 border-rose-400/25",
    card: "border-rose-400/25 bg-rose-500/10",
  },
  Term: {
    chip: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
    card: "border-emerald-400/25 bg-emerald-500/10",
  },
  Place: {
    chip: "bg-lime-500/12 text-lime-200 border-lime-400/25",
    card: "border-lime-400/25 bg-lime-500/10",
  },
  Concept: {
    chip: "bg-fuchsia-500/12 text-fuchsia-200 border-fuchsia-400/25",
    card: "border-fuchsia-400/25 bg-fuchsia-500/10",
  },
  Rule: {
    chip: "bg-violet-500/12 text-violet-200 border-violet-400/25",
    card: "border-violet-400/25 bg-violet-500/10",
  },
  Item: {
    chip: "bg-orange-500/12 text-orange-200 border-orange-400/25",
    card: "border-orange-400/25 bg-orange-500/10",
  },
  WorldEntity: {
    chip: "bg-zinc-500/12 text-zinc-200 border-zinc-400/25",
    card: "border-zinc-400/25 bg-zinc-500/10",
  },
};

export const ENTITY_TYPE_CANVAS_THEME: Record<
  WorldEntitySourceType,
  {
    accent: string;
    edge: string;
    selectedEdge: string;
    glow: string;
    surface: string;
    handle: string;
  }
> = {
  Character: {
    accent: "#77b9ff",
    edge: "rgba(119,185,255,0.46)",
    selectedEdge: "rgba(150,212,255,0.95)",
    glow: "rgba(119,185,255,0.22)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#b9dcff",
  },
  Event: {
    accent: "#f3c86b",
    edge: "rgba(243,200,107,0.48)",
    selectedEdge: "rgba(252,223,135,0.96)",
    glow: "rgba(243,200,107,0.2)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#ffe3a0",
  },
  Faction: {
    accent: "#ef7b94",
    edge: "rgba(239,123,148,0.46)",
    selectedEdge: "rgba(251,165,184,0.95)",
    glow: "rgba(239,123,148,0.21)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#ffb2c0",
  },
  Term: {
    accent: "#4fd4b4",
    edge: "rgba(79,212,180,0.46)",
    selectedEdge: "rgba(141,240,209,0.94)",
    glow: "rgba(79,212,180,0.2)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#99f2de",
  },
  Place: {
    accent: "#84d46e",
    edge: "rgba(132,212,110,0.46)",
    selectedEdge: "rgba(180,238,157,0.95)",
    glow: "rgba(132,212,110,0.2)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#c3f7aa",
  },
  Concept: {
    accent: "#c88cff",
    edge: "rgba(200,140,255,0.46)",
    selectedEdge: "rgba(224,188,255,0.95)",
    glow: "rgba(200,140,255,0.2)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#e6c7ff",
  },
  Rule: {
    accent: "#ac90ff",
    edge: "rgba(172,144,255,0.46)",
    selectedEdge: "rgba(208,188,255,0.95)",
    glow: "rgba(172,144,255,0.2)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#d4c3ff",
  },
  Item: {
    accent: "#ff9a62",
    edge: "rgba(255,154,98,0.46)",
    selectedEdge: "rgba(255,198,160,0.95)",
    glow: "rgba(255,154,98,0.2)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#ffd1b3",
  },
  WorldEntity: {
    accent: "#b6bec9",
    edge: "rgba(182,190,201,0.46)",
    selectedEdge: "rgba(225,231,238,0.95)",
    glow: "rgba(182,190,201,0.18)",
    surface:
      "linear-gradient(180deg, hsl(var(--secondary) / 0.92) 0%, hsl(var(--canvas) / 0.96) 100%)",
    handle: "#e8edf3",
  },
};

export const GRAPH_FALLBACK_CANVAS_SIZE = {
  width: 1800,
  height: 1200,
};

export const GRAPH_NODE_CARD_SIZE = {
  width: 220,
  height: 132,
};

export const GRAPH_PLUGIN_EMPTY_ICON = Package2;
