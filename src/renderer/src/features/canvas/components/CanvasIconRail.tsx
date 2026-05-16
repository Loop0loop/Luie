/**
 * CanvasIconRail — fixed-width vertical icon strip for the canvas Sidebar.
 *
 * P2 layout shell. Activates a panel on click; clicking the active icon again
 * collapses the side panel (toggleActivity). Width is anchored to
 * CANVAS_ICON_RAIL_WIDTH_PX so the surrounding Sidebar / SidePanelRouter share
 * the same pixel grid.
 */
import { useTranslation } from "react-i18next";
import {
  Compass,
  LayoutGrid,
  Users,
  Brain,
  Search,
  type LucideIcon,
} from "lucide-react";
import { CANVAS_ICON_RAIL_WIDTH_PX } from "@shared/constants/layoutSizing";
import { cn } from "@shared/types/utils";
import { useCanvasViewStore } from "../stores";
import type { CanvasActivityPanel } from "../types";

interface RailItem {
  panel: CanvasActivityPanel;
  Icon: LucideIcon;
  /** i18n key: `canvas.activity.<key>` */
  i18nKey: string;
}

const RAIL_ITEMS: ReadonlyArray<RailItem> = [
  { panel: "explorer", Icon: Compass, i18nKey: "explorer" },
  { panel: "canvas", Icon: LayoutGrid, i18nKey: "canvas" },
  { panel: "entities", Icon: Users, i18nKey: "entities" },
  { panel: "memory", Icon: Brain, i18nKey: "memory" },
  { panel: "search", Icon: Search, i18nKey: "search" },
];

export default function CanvasIconRail() {
  const { t } = useTranslation();
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isActivityCollapsed = useCanvasViewStore(
    (state) => state.isActivityCollapsed,
  );
  const setActivePanel = useCanvasViewStore((state) => state.setActivePanel);
  const toggleActivity = useCanvasViewStore((state) => state.toggleActivity);

  return (
    <nav
      aria-label={t("canvas.sidebar.activity")}
      className="flex h-full shrink-0 flex-col items-center gap-1 border-r border-border/40 bg-sidebar py-2"
      style={{ width: CANVAS_ICON_RAIL_WIDTH_PX }}
      data-testid="canvas-icon-rail"
    >
      {RAIL_ITEMS.map(({ panel, Icon, i18nKey }) => {
        const isActive = panel === activePanel && !isActivityCollapsed;
        const label = t(`canvas.activity.${i18nKey}`);
        return (
          <button
            key={panel}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => {
              if (panel === activePanel) {
                // Re-clicking the active icon collapses the side panel.
                toggleActivity();
                return;
              }
              setActivePanel(panel);
            }}
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
              isActive
                ? "text-fg"
                : "text-muted opacity-40 hover:opacity-70 hover:text-fg",
            )}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent"
              />
            )}
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </nav>
  );
}
