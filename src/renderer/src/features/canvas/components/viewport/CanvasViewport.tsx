/**
 * CanvasViewport — React-Flow based canvas viewport (read-only UI/UX shell).
 *
 * Visual language: Obsidian Canvas
 *   - Infinite dot-grid background
 *   - Card-style nodes with rounded corners and subtle shadow
 *   - Smooth bezier edges with optional labels
 *   - MiniMap and Controls anchored to the bottom corners
 *
 * Interaction (read-only — UI/UX scaffolding stage):
 *   - Drag, pan, zoom: all enabled visually but no persistence yet
 *   - Node click → canvasViewStore.selectNode (renderer-only state)
 *   - Edge add / delete / reconnect: disabled
 */

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  PanOnScrollMode,
  type Node,
  type OnSelectionChangeParams,
} from "reactflow";
import { useShallow } from "zustand/react/shallow";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import {
  CANVAS_FIT_VIEW_PADDING,
  CANVAS_RF_EDGE_TYPE_CANVAS,
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_RF_NODE_TYPE_MEMO,
  CANVAS_RF_NODE_TYPE_TIMELINE,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
} from "@shared/constants/canvasSizing";
import { useCanvasViewStore } from "../../stores";
import {
  buildFlowGraph,
  CANVAS_NODE_KIND_COLOUR,
  type CanvasNodeKind,
} from "../../types";
import { CanvasEdge } from "./edges/CanvasEdge";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityNode } from "./nodes/EntityNode";
import { MemoNode } from "./nodes/MemoNode";
import { TimelineNode } from "./nodes/TimelineNode";
import CanvasEmptyState from "./CanvasEmptyState";

// ─── static type maps (defined outside component so RF doesn't warn) ──────────

const NODE_TYPES = {
  [CANVAS_RF_NODE_TYPE_ENTITY]: EntityNode,
  [CANVAS_RF_NODE_TYPE_MEMO]: MemoNode,
  [CANVAS_RF_NODE_TYPE_TIMELINE]: TimelineNode,
} as const;

const EDGE_TYPES = {
  [CANVAS_RF_EDGE_TYPE_RELATION]: RelationEdge,
  [CANVAS_RF_EDGE_TYPE_CANVAS]: CanvasEdge,
} as const;

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

const FALLBACK_MINIMAP_COLOUR = "var(--bg-element)";

function getMiniMapNodeColour(node: Node): string {
  const data = node.data as { kind?: CanvasNodeKind } | undefined;
  if (!data?.kind) return FALLBACK_MINIMAP_COLOUR;
  return CANVAS_NODE_KIND_COLOUR[data.kind] ?? FALLBACK_MINIMAP_COLOUR;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function CanvasViewport() {
  const { selection, selectNode, clearSelection } = useCanvasViewStore(
    useShallow((state) => ({
      selection: state.selection,
      selectNode: state.selectNode,
      clearSelection: state.clearSelection,
    })),
  );

  const graphData = useWorldBuildingStore((state) => state.graphData);

  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(graphData, selectedNodeId),
    [graphData, selectedNodeId],
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

  if (nodes.length === 0) {
    return <CanvasEmptyState />;
  }

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
        className="bg-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--border-default)"
          className="opacity-40"
        />

        <Controls
          showInteractive={false}
          className="border-border! bg-panel! shadow-panel! [&>button]:border-border! [&>button]:bg-panel! [&>button]:text-muted! [&>button:hover]:bg-surface-hover! [&>button:hover]:text-fg!"
        />

        <MiniMap
          nodeColor={getMiniMapNodeColour}
          maskColor="var(--bg-canvas)"
          className="border-border! bg-panel! shadow-panel!"
          style={{ background: "var(--bg-panel)" }}
        />
      </ReactFlow>
    </div>
  );
}
