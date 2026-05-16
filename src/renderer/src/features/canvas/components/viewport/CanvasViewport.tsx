/**
 * CanvasViewport — renders CanvasProjection nodes and edges on an SVG canvas.
 *
 * P5 implementation:
 *   - Nodes: coloured rect + label, kind-based colour token
 *   - Edges: SVG line, solid/dashed style
 *   - Zoom/pan: wheel + pointer-drag on the background
 *   - Node click: canvasViewStore.selectNode(id)
 *   - Empty state: <CanvasEmptyState /> when no nodes
 *
 * Layout: nodes without a persisted position (0,0) are auto-placed in a
 * simple grid so they don't all stack. P7 will use DB-persisted positions.
 */
import { useRef, useCallback, type PointerEvent } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCanvasViewStore } from "../../stores";
import type { CanvasProjection, CanvasProjectionNode, CanvasNodeKind } from "../../types";
import CanvasEmptyState from "./CanvasEmptyState";

/* ─── colour map ─────────────────────────────────────────────────────────── */

const KIND_COLOURS: Record<CanvasNodeKind, string> = {
  chapter: "var(--color-accent, #3b82f6)",
  character: "#f97316",   // orange-500
  event: "#a855f7",       // purple-500
  faction: "#ef4444",     // red-500
  term: "#22c55e",        // green-500
  "world-entity": "#64748b", // slate-500
};

const NODE_W = 140;
const NODE_H = 44;
const GRID_COLS = 5;
const GRID_GAP_X = 180;
const GRID_GAP_Y = 80;
const GRID_ORIGIN_X = 60;
const GRID_ORIGIN_Y = 60;

/* ─── helpers ────────────────────────────────────────────────────────────── */

/** Auto-place nodes that have no persisted position (both 0). */
function resolvePositions(
  nodes: CanvasProjectionNode[],
): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  let autoIndex = 0;
  for (const node of nodes) {
    if (node.x !== 0 || node.y !== 0) {
      map.set(node.id, { x: node.x, y: node.y });
    } else {
      const col = autoIndex % GRID_COLS;
      const row = Math.floor(autoIndex / GRID_COLS);
      map.set(node.id, {
        x: GRID_ORIGIN_X + col * GRID_GAP_X,
        y: GRID_ORIGIN_Y + row * GRID_GAP_Y,
      });
      autoIndex++;
    }
  }
  return map;
}

/* ─── component ─────────────────────────────────────────────────────────── */

interface CanvasViewportProps {
  projection: CanvasProjection;
}

export default function CanvasViewport({ projection }: CanvasViewportProps) {
  const { viewport, selection, setViewport, selectNode, clearSelection } =
    useCanvasViewStore(
      useShallow((state) => ({
        viewport: state.viewport,
        selection: state.selection,
        setViewport: state.setViewport,
        selectNode: state.selectNode,
        clearSelection: state.clearSelection,
      })),
    );

  const svgRef = useRef<SVGSVGElement>(null);
  const isPanningRef = useRef(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });

  /* ── zoom via wheel ── */
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setViewport({ zoom: viewport.zoom * delta });
    },
    [viewport.zoom, setViewport],
  );

  /* ── pan via pointer drag on background ── */
  const handleBgPointerDown = useCallback(
    (e: PointerEvent<SVGRectElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      isPanningRef.current = true;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      clearSelection();
    },
    [clearSelection],
  );

  const handleBgPointerMove = useCallback(
    (e: PointerEvent<SVGRectElement>) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      setViewport({
        pan: {
          x: viewport.pan.x + dx,
          y: viewport.pan.y + dy,
        },
      });
    },
    [viewport.pan, setViewport],
  );

  const handleBgPointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  if (projection.nodes.length === 0) {
    return <CanvasEmptyState />;
  }

  const positions = resolvePositions(projection.nodes);
  const { zoom, pan } = viewport;
  const transform = `translate(${pan.x}, ${pan.y}) scale(${zoom})`;

  return (
    <svg
      ref={svgRef}
      className="h-full w-full cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      data-testid="canvas-viewport"
    >
      {/* Invisible background rect for pan/click-to-deselect */}
      <rect
        x="-50000"
        y="-50000"
        width="100000"
        height="100000"
        fill="transparent"
        onPointerDown={handleBgPointerDown}
        onPointerMove={handleBgPointerMove}
        onPointerUp={handleBgPointerUp}
      />

      <g transform={transform}>
        {/* ── Edges ── */}
        {projection.edges.map((edge) => {
          const src = positions.get(edge.sourceId);
          const tgt = positions.get(edge.targetId);
          if (!src || !tgt) return null;
          const x1 = src.x + NODE_W / 2;
          const y1 = src.y + NODE_H / 2;
          const x2 = tgt.x + NODE_W / 2;
          const y2 = tgt.y + NODE_H / 2;
          return (
            <g key={edge.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--color-border, #e2e8f0)"
                strokeWidth={1.5}
                strokeDasharray={edge.style === "dashed" ? "6 3" : undefined}
                opacity={0.7}
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--color-muted, #94a3b8)"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Nodes ── */}
        {projection.nodes.map((node) => {
          const pos = positions.get(node.id) ?? { x: 0, y: 0 };
          const isSelected =
            selection.kind === "node" && selection.id === node.id;
          const colour = KIND_COLOURS[node.kind] ?? KIND_COLOURS["world-entity"];
          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => {
                e.stopPropagation();
                selectNode(node.id);
              }}
              style={{ cursor: "pointer" }}
              data-node-id={node.id}
            >
              {/* Shadow / selection ring */}
              {isSelected && (
                <rect
                  x={-3}
                  y={-3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={8}
                  fill="none"
                  stroke={colour}
                  strokeWidth={2}
                  opacity={0.8}
                />
              )}
              {/* Node body */}
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="var(--bg-panel, #1e293b)"
                stroke={colour}
                strokeWidth={isSelected ? 2 : 1}
                opacity={isSelected ? 1 : 0.9}
              />
              {/* Kind colour strip */}
              <rect
                width={4}
                height={NODE_H}
                rx={3}
                fill={colour}
              />
              {/* Label */}
              <text
                x={14}
                y={NODE_H / 2 + 1}
                dominantBaseline="middle"
                fontSize={12}
                fontWeight={isSelected ? 600 : 400}
                fill="var(--text-primary, #f1f5f9)"
              >
                {node.label.length > 16
                  ? `${node.label.slice(0, 15)}…`
                  : node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
