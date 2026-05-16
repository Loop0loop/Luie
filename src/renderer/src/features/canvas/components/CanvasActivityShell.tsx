/**
 * CanvasActivityShell — composition of CanvasIconRail + SidePanelRouter, fed
 * into Sidebar.tsx via the `canvasContent` prop when the renderer is in
 * canvas mode. The Sidebar wrapper keeps the width/border so this shell only
 * needs to lay out the icon rail next to the active panel.
 */
import CanvasIconRail from "./CanvasIconRail";
import SidePanelRouter from "./SidePanelRouter";

export default function CanvasActivityShell() {
  return (
    <div className="flex h-full w-full" data-testid="canvas-activity-shell">
      <CanvasIconRail />
      <SidePanelRouter />
    </div>
  );
}
