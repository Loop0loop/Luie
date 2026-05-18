/**
 * StaticCanvasViewport — 정적 세계관 설계 캔버스 (UI/UX 밑작업).
 *
 * SRP:
 *   - 데이터: useStaticProjection()
 *   - 선택 상태: useCanvasSelection()
 *   - 렌더링: ReactFlow + CanvasFloatingToolbar + BottomCreateToolbar
 *   - BottomCreateToolbar는 별도 파일로 분리됩니다.
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
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
  CANVAS_FIT_VIEW_PADDING,
} from "@shared/constants/canvasSizing";
import { useCanvasViewStore } from "../../stores";
import { buildFlowGraph } from "../../types";
import { useStaticProjection } from "../../hooks/useStaticProjection";
import { useCanvasSelection } from "../../hooks/useCanvasView";
import { CanvasFloatingToolbar } from "./CanvasFloatingToolbar";
import { BottomCreateToolbar } from "./BottomCreateToolbar";
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

// ─── component ────────────────────────────────────────────────────────────────

export default function StaticCanvasViewport() {
  const projection = useStaticProjection();
  const { selection } = useCanvasSelection();

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
    <div className="relative h-full w-full" data-testid="canvas-static-viewport">
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
        nodesDraggable
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
          gap={20}
          size={1.2}
          color="var(--border-default)"
          className="opacity-30"
        />

        {/* useReactFlow()를 쓰므로 반드시 <ReactFlow> 내부에 위치 */}
        <CanvasFloatingToolbar />
      </ReactFlow>

      {/* useReactFlow() 미사용이므로 외부 가능 */}
      <BottomCreateToolbar />
    </div>
  );
}
