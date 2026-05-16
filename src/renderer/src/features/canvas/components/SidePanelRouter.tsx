/**
 * SidePanelRouter — routes the active canvas activity panel to its content
 * component. Collapsed state hides the panel area entirely (icon rail stays).
 */
import { lazy, Suspense } from "react";
import { useCanvasViewStore } from "../stores";
import type { CanvasActivityPanel } from "../types";

const ExplorerPanel = lazy(() => import("./activity/ExplorerPanel"));
const CanvasControlPanel = lazy(() => import("./activity/CanvasControlPanel"));
const EntitiesPanel = lazy(() => import("./activity/EntitiesPanel"));
const MemoryPanel = lazy(() => import("./activity/MemoryPanel"));
const SearchPanel = lazy(() => import("./activity/SearchPanel"));

const PANEL_MAP: Record<CanvasActivityPanel, React.LazyExoticComponent<() => React.JSX.Element>> = {
  explorer: ExplorerPanel,
  canvas: CanvasControlPanel,
  entities: EntitiesPanel,
  memory: MemoryPanel,
  search: SearchPanel,
};

const panelFallback = (
  <div className="flex h-full items-center justify-center text-xs text-muted" />
);

export default function SidePanelRouter() {
  const activePanel = useCanvasViewStore((state) => state.activePanel);
  const isActivityCollapsed = useCanvasViewStore(
    (state) => state.isActivityCollapsed,
  );

  if (isActivityCollapsed) {
    return null;
  }

  const ActivePanel = PANEL_MAP[activePanel];
  return (
    <div
      className="flex h-full min-w-0 flex-1 flex-col bg-sidebar overflow-hidden"
      data-testid={`canvas-side-panel-${activePanel}`}
    >
      <Suspense fallback={panelFallback}>
        <ActivePanel />
      </Suspense>
    </div>
  );
}
