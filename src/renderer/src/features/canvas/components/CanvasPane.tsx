/**
 * CanvasPane — viewport-only shell for the canvas feature.
 *
 * P0 placeholder: renders an empty surface so the host (ScrivenerLayout/world graph
 * window) can mount it without crashing while the real toolbar/viewport/status-bar
 * structure is built in P3.
 */
export default function CanvasPane() {
  return <div className="h-full w-full bg-canvas" />;
}
