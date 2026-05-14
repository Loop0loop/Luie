import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import { CANVAS_STAGE } from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";
import { CANVAS_NODE_TYPES, type CanvasNodeData } from "./nodes";
import { CanvasControls } from "./CanvasControls";

interface CanvasStageProps {
  nodes: Node<CanvasNodeData>[];
  edges: Edge[];
  /** 노드 드래그가 끝났을 때 위치를 영구 저장. id, x, y. */
  onNodeMoved?: (id: string, x: number, y: number) => void;
}

/**
 * 캔버스 stage. react-flow 컨테이너.
 *
 * 주의: ReactFlowProvider는 부모(WorldCanvasPanel)에서 감싸야 한다.
 * Outline 같은 사이드 컴포넌트들도 useReactFlow()를 사용하므로
 * Provider 범위가 캔버스 전체여야 한다.
 *
 * - 5종 nodeTypes 등록
 * - 기본 Controls 대신 CanvasControls
 * - 드래그 종료 시 onNodeMoved 콜백
 */
export function CanvasStage({ nodes, edges, onNodeMoved }: CanvasStageProps) {
  const showMiniMap = useCanvasUiStore((s) => s.showMiniMap);
  const selectNode = useCanvasUiStore((s) => s.selectNode);
  const selectEdge = useCanvasUiStore((s) => s.selectEdge);
  const clearSelection = useCanvasUiStore((s) => s.clearSelection);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => selectNode(node.id),
    [selectNode],
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => selectEdge(edge.id),
    [selectEdge],
  );

  const handlePaneClick = useCallback(
    (_event: ReactMouseEvent) => {
      clearSelection();
    },
    [clearSelection],
  );

  const handleNodeDragStop = useCallback<NodeMouseHandler>(
    (_event, node) => {
      onNodeMoved?.(node.id, node.position.x, node.position.y);
    },
    [onNodeMoved],
  );

  return (
    <div className="relative h-full min-h-0 w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={CANVAS_NODE_TYPES}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onNodeDragStop={handleNodeDragStop}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={CANVAS_STAGE.GRID_GAP}
          size={CANVAS_STAGE.GRID_DOT_SIZE}
          className="bg-background!"
        />
        {showMiniMap ? (
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="rounded-lg! border! border-border/60! bg-background/80! shadow-sm!"
          />
        ) : null}
      </ReactFlow>
      <CanvasControls />
    </div>
  );
}
