import type { CanvasActivityPanel } from "../types/canvas.types";
import type { CanvasRailIconName } from "../types/canvasPanel.types";

export const CANVAS_PANEL_KEYS: ReadonlyArray<CanvasActivityPanel> = [
  "explorer",
  "graph",
  "canvas",
  "memory",
  "search",
] as const;

export interface CanvasRailItem {
  readonly panel: CanvasActivityPanel;
  readonly i18nKey: string;
  readonly iconName: CanvasRailIconName;
}

export const CANVAS_RAIL_ITEMS: ReadonlyArray<CanvasRailItem> = [
  { panel: "explorer",  i18nKey: "explorer",  iconName: "Compass"    },
  { panel: "graph",     i18nKey: "graph",     iconName: "Waypoints"  },
  { panel: "canvas",    i18nKey: "canvas",    iconName: "LayoutGrid" },
  { panel: "memory",    i18nKey: "memory",    iconName: "Brain"      },
  { panel: "search",    i18nKey: "search",    iconName: "Search"     },
] as const;

export const GRAPH_RELATIONSHIP_FILTERS = ["등장", "대화", "갈등", "소속", "동맹", "떡밥"] as const;
