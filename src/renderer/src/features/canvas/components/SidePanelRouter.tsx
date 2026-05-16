/**
 * SidePanelRouter — routes the active canvas activity panel to its content
 * component. P2 stage: every panel is a labelled placeholder so we can verify
 * Sidebar integration before P4 ships real content.
 */
import { useTranslation } from "react-i18next";
import { useCanvasViewStore } from "../stores";
import type { CanvasActivityPanel } from "../types";

const PLACEHOLDER_BY_PANEL: Record<CanvasActivityPanel, string> = {
  explorer: "explorer",
  canvas: "canvas",
  entities: "entities",
  memory: "memory",
  search: "search",
};

export default function SidePanelRouter() {
  const { t } = useTranslation();
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isActivityCollapsed = useCanvasViewStore(
    (state) => state.isActivityCollapsed,
  );

  if (isActivityCollapsed) {
    return null;
  }

  const i18nKey = PLACEHOLDER_BY_PANEL[activePanel];
  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col bg-sidebar"
      data-testid={`canvas-side-panel-${activePanel}`}
    >
      <div className="flex items-center px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {t(`canvas.activity.${i18nKey}`)}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 text-xs text-muted">
        {/* P4 will replace this with real panel content. */}
      </div>
    </div>
  );
}
