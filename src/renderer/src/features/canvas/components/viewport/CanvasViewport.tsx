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

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  PanOnScrollMode,
  type OnSelectionChangeParams,
} from "reactflow";
import {
  CANVAS_FIT_VIEW_PADDING,
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
} from "@shared/constants/canvasSizing";
import { useCanvasViewStore } from "../../stores";
import {
  buildFlowGraph,
  type CanvasProjection,
} from "../../types";
import { useCanvasSelection } from "../../hooks/useCanvasView";
import { CanvasFloatingToolbar } from "./CanvasFloatingToolbar";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityNode } from "./nodes/EntityNode";

// ─── static type maps ─────────────────────────────────────────────────────────

const NODE_TYPES = {
  [CANVAS_RF_NODE_TYPE_ENTITY]: EntityNode,
} as const;

const EDGE_TYPES = {
  [CANVAS_RF_EDGE_TYPE_RELATION]: RelationEdge,
} as const;

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

// ─── props ────────────────────────────────────────────────────────────────────

interface CanvasViewportProps {
  /** Scope/mode-filtered projection. Non-null — CanvasPane only renders this when status === "ready". */
  projection: CanvasProjection;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CanvasViewport({ projection }: CanvasViewportProps) {
  // 선택 상태만 구독 — 빈번히 바뀌는 상태를 분리해 불필요한 리렌더 방지
  const { selection } = useCanvasSelection();

  // actions는 store에서 직접 가져옴 (shallow 비교 불필요)
  const selectNode     = useCanvasViewStore((s) => s.selectNode);
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);

  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(projection, selectedNodeId),
    [projection, selectedNodeId],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length === 1 && selectedNodes[0]) {
        selectNode(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        clearSelection();
      }
    },
    [selectNode, clearSelection],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div className="h-full w-full" data-testid="canvas-viewport">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        minZoom={CANVAS_ZOOM_MIN}
        maxZoom={CANVAS_ZOOM_MAX}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        className="bg-app"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="var(--text-subtle)"
          className="opacity-20"
        />

        {/* useReactFlow()를 쓰므로 반드시 <ReactFlow> 내부에 위치 */}
        <CanvasFloatingToolbar />
      </ReactFlow>
    </div>
  );
}
