import { useCallback, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MiniMap,
  PanOnScrollMode,
  useEdgesState,
  useNodesState,
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
 * 상태 모델:
 *   props.nodes/edges는 도메인 store에서 파생되는 "원본". 이걸 그대로
 *   <ReactFlow nodes>에 controlled로 박으면 react-flow가 internal state를
 *   업데이트하지 않아 드래그가 시각적으로 안 따라온다(망가진 DnD).
 *
 *   대신 useNodesState/useEdgesState로 internal state를 두고, props가
 *   바뀔 때만 sync한다. 드래그 위치는 react-flow가 직접 갱신하고,
 *   onNodeDragStop에서 외부 store에 영구 저장 → 다음 prop sync는
 *   같은 위치로 되돌리지 않는다.
 *
 * Provider는 부모(WorldCanvasPanel)에서 감싼다.
 */
export function CanvasStage({ nodes, edges, onNodeMoved }: CanvasStageProps) {
  const showMiniMap = useCanvasUiStore((s) => s.showMiniMap);
  const selectNode = useCanvasUiStore((s) => s.selectNode);
  const selectEdge = useCanvasUiStore((s) => s.selectEdge);
  const clearSelection = useCanvasUiStore((s) => s.clearSelection);

  const [rfNodes, setRfNodes, onNodesChange] =
    useNodesState<CanvasNodeData>(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  // props가 바뀌면 internal state로 흘려보낸다.
  // 드래그 중에는 props.position이 그대로이므로 화면이 튀지 않고,
  // 드래그 종료 후 store가 갱신되면 같은 위치로 동기화된다.
  useEffect(() => {
    setRfNodes(nodes);
  }, [nodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(edges);
  }, [edges, setRfEdges]);

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
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
          className="bg-app!"
        />
        {showMiniMap ? (
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="rounded-lg! border! border-border! bg-panel/85! shadow-sm!"
          />
        ) : null}
      </ReactFlow>
      <CanvasControls />
    </div>
  );
}
