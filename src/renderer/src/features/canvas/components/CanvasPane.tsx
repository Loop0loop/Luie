/**
 * CanvasPane — viewport-only shell for the canvas feature.
 *
 * Phase 3 layout:
 *   ┌─────────────── CanvasToolbar (fixed height) ───────────────┐
 *   │                                                            │
 *   │         viewport area (P5 will replace empty state)        │
 *   │                                                            │
 *   ├──────────────  CanvasStatusBar (fixed height) ─────────────┤
 *
 * The pane never owns the activity sidebar or binder — those live in the
 * surrounding Sidebar (P2) and BinderSidebar (P6). CanvasPane is mounted as
 * the MainLayout `children` slot when `mainView.type === "canvas"`.
 */
import CanvasToolbar from "./viewport/CanvasToolbar";
import CanvasStatusBar from "./viewport/CanvasStatusBar";
import CanvasEmptyState from "./viewport/CanvasEmptyState";

export default function CanvasPane() {
  return (
    <div
      className="flex h-full w-full flex-col bg-canvas"
      data-testid="canvas-pane"
    >
      <CanvasToolbar />
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* P5 will mount <CanvasViewport /> here when projection is available. */}
        <CanvasEmptyState />
      </div>
      <CanvasStatusBar />
    </div>
  );
}
