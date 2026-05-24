/**
 * BaseCanvasViewport — shared ReactFlow viewport base component.
 *
 * Extracts 80%+ duplicated logic from CanvasViewport and StaticCanvasViewport.
 * Both wrappers pass differing props (nodeTypes, edgeTypes, projection source, etc.).
 *
 * Differences handled via props:
 *   - nodeTypes / edgeTypes: passed from wrapper (dynamic vs static)
 *   - onNodesChange / onEdgesChange: optional (dynamic viewport has these)
 *   - projection: passed from wrapper (useCanvasProjection vs useStaticProjection)
 *   - nodesDraggable: configurable (false for dynamic, true for static)
 *   - extraChildren: optional children rendered inside ReactFlow
 *   - bottomToolbar: optional toolbar rendered outside ReactFlow
 *   - wrapperClassName: outer div className customization
 *   - dataTestId: outer div data-testid customization
 */

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  PanOnScrollMode,
  type NodeChange,
  type EdgeChange,
  type OnSelectionChangeParams,
  type NodeProps,
  type EdgeProps,
} from "reactflow";
import { CANVAS_FIT_VIEW_PADDING, CANVAS_ZOOM_MAX, CANVAS_ZOOM_MIN } from "@shared/constants/canvasSizing";
import { useCanvasViewStore } from "../../stores";
import { type CanvasProjection } from "../../types";
import { buildFlowGraph } from "../../utils";
import { useCanvasSelection } from "../../hooks/useCanvasView";
import { handleSelectionChange, handlePaneClick } from "../../utils/selectionHandlers";

// ─── static config (shared) ───────────────────────────────────────────────────

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;

// ─── props ────────────────────────────────────────────────────────────────────

interface BaseCanvasViewportProps {
  /** Scope/mode-filtered projection from parent hook */
  projection: CanvasProjection;
  /** Node type map from wrapper (dynamic or static) */
  nodeTypes: Record<string, React.ComponentType<NodeProps>>;
  /** Edge type map from wrapper (dynamic or static) */
  edgeTypes: Record<string, React.ComponentType<EdgeProps>>;
  /** Optional nodes change handler (dynamic viewport only) */
  onNodesChange?: (changes: NodeChange[]) => void;
  /** Optional edges change handler (dynamic viewport only) */
  onEdgesChange?: (changes: EdgeChange[]) => void;
  /** Whether nodes are draggable (static=true, dynamic=false) */
  nodesDraggable?: boolean;
  /** Extra children inside ReactFlow (e.g., CanvasFloatingToolbar) */
  extraChildren?: React.ReactNode;
  /** Toolbar outside ReactFlow (e.g., BottomCreateToolbar) */
  bottomToolbar?: React.ReactNode;
  /** Outer wrapper className */
  wrapperClassName?: string;
  /** Outer wrapper data-testid */
  dataTestId?: string;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function BaseCanvasViewport({
  projection,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  nodesDraggable = true,
  extraChildren,
  bottomToolbar,
  wrapperClassName = "h-full w-full",
  dataTestId = "canvas-viewport",
}: BaseCanvasViewportProps) {
  const { selection } = useCanvasSelection();
  const selectNode = useCanvasViewStore((s) => s.selectNode);
  const clearSelection = useCanvasViewStore((s) => s.clearSelection);

  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(projection, selectedNodeId),
    [projection, selectedNodeId],
  );

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      handleSelectionChange(params, selectNode, clearSelection);
    },
    [selectNode, clearSelection],
  );

  const onPaneClick = useCallback(() => {
    handlePaneClick(clearSelection);
  }, [clearSelection]);

  return (
    <div className={wrapperClassName} data-testid={dataTestId}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        minZoom={CANVAS_ZOOM_MIN}
        maxZoom={CANVAS_ZOOM_MAX}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={nodesDraggable}
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        proOptions={PRO_OPTIONS}
        className="bg-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="currentColor"
          className="text-muted-foreground/25 dark:text-muted-foreground/35"
        />
        {extraChildren}
      </ReactFlow>
      {bottomToolbar}
    </div>
  );
}
