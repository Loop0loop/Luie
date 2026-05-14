import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type EdgeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import { CANVAS_STAGE } from "../shared/constants";
import { useCanvasUiStore } from "../store/canvasUiStore";

interface CanvasStageProps {
  nodes: Node[];
  edges: Edge[];
}

/**
 * 캔버스 stage. react-flow 컨테이너의 얇은 래퍼.
 *
 * 본 단계에서는 빈 nodes/edges를 받아 마운트만 한다.
 * 노드 변환(domain → react-flow), 인터랙션 핸들러, nodeTypes 등록 등은
 * 다음 단계에서 채운다.
 */
export function CanvasStage({ nodes, edges }: CanvasStageProps) {
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

  return (
    <div className="relative h-full min-h-0 w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={CANVAS_STAGE.GRID_GAP}
          size={CANVAS_STAGE.GRID_DOT_SIZE}
        />
        <Controls position="bottom-right" showInteractive={false} />
        {showMiniMap ? (
          <MiniMap pannable zoomable position="bottom-left" />
        ) : null}
      </ReactFlow>
    </div>
  );
}
