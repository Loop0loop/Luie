/**
 * CanvasViewport — React-Flow based canvas viewport (read-only, dynamic mode).
 *
 * Props:
 *   projection — scope/mode-filtered CanvasProjection from useCanvasProjection.
 *                Non-null guaranteed by CanvasPane (only rendered when status === "ready").
 *
 * Visual language: Obsidian Canvas
 *   - Infinite dot-grid background
 *   - Card-style entity nodes with left colour strip
 *   - Smooth bezier relation edges with optional labels
 *   - Controls (좌하단) — 미니맵 없음 (Obsidian 스타일)
 *
 * Interaction (read-only — UI/UX scaffolding stage):
 *   - Pan / zoom: enabled
 *   - Node click → canvasViewStore.selectNode (renderer-only state)
 *   - Node drag / edge connect / delete: disabled
 *
 * Store dependency: canvasViewStore only (selection state).
 * worldBuildingStore is NOT accessed here — data flows in via projection prop.
 */

import { useMemo } from "react";
import {
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
} from "@shared/constants/canvasSizing";
import { CanvasProjection } from "../../types";
import { CanvasFloatingToolbar } from "./CanvasFloatingToolbar";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityNode } from "./nodes/EntityNode";
import BaseCanvasViewport from "./BaseCanvasViewport";

// ─── static type maps ─────────────────────────────────────────────────────────

const NODE_TYPES = {
  [CANVAS_RF_NODE_TYPE_ENTITY]: EntityNode,
} as const;

const EDGE_TYPES = {
  [CANVAS_RF_EDGE_TYPE_RELATION]: RelationEdge,
} as const;

// ─── props ────────────────────────────────────────────────────────────────────

interface CanvasViewportProps {
  /** Scope/mode-filtered projection. Non-null — CanvasPane only renders this when status === "ready". */
  projection: CanvasProjection;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CanvasViewport({ projection }: CanvasViewportProps) {
  const nodeTypes = useMemo(() => NODE_TYPES, []);
  const edgeTypes = useMemo(() => EDGE_TYPES, []);

  return (
    <BaseCanvasViewport
      projection={projection}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      extraChildren={<CanvasFloatingToolbar />}
      wrapperClassName="h-full w-full"
      dataTestId="canvas-viewport"
    />
  );
}
