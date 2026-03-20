import {
  Boxes,
  Clock3,
  LibraryBig,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { GraphSurfaceTab } from "../../types";

export const GRAPH_SURFACE_TAB_ITEMS: Array<{
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
