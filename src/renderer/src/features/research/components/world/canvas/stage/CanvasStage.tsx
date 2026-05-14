import { useCallback, type MouseEvent as ReactMouseEvent } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  PanOnScrollMode,
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
 * Obsidian 트랙패드 UX:
 *   - 두 손가락 스크롤(트랙패드 wheel) → pan (양방향 자유)
 *   - 핀치(ctrlKey + wheel) → zoom
 *   - 빈 영역 좌클릭 + drag → 박스 셀렉션
 *   - 미들/우클릭 + drag → pan (좌클릭은 셀렉션/노드 이동에 양보)
 *   - 노드 좌클릭 + drag → 노드 이동
 *   - 더블클릭 → 줌하지 않음 (다음 단계에서 노드 편집 진입)
 *
 * Provider는 부모(WorldCanvasPanel)에서 감싼다.
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
        // ── Obsidian 트랙패드 UX ──────────────────────────────
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.8}
        zoomOnPinch
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        // 좌클릭 빈영역 drag = 박스 셀렉션, 미들/우클릭 = pan
        selectionOnDrag
        panOnDrag={[1, 2]}
        // ── 줌 한계 ───────────────────────────────────────────
        minZoom={0.2}
        maxZoom={2.5}
        // ── 기타 ──────────────────────────────────────────────
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
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
