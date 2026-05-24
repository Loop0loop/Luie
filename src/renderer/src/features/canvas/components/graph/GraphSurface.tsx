import { useEffect, useCallback } from "react";
import ReactFlow, { Background, BackgroundVariant, PanOnScrollMode, type Node, useNodesState, useEdgesState } from "reactflow";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";
import { calculateForceLayout } from "../../utils/graphLayout";
import { MOCK_GRAPH_NODES, MOCK_GRAPH_EDGES } from "../../constants/graphMockData";

// React Flow 인라인 객체 오버헤드 0%를 위한 모듈 레벨 상수화 및 ES1st 룰 완비
const PRO_OPTIONS = { hideAttribution: true } as const;

const nodeTypes = {
  pensive: PensiveNode,
};

export default function GraphSurface() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Zustand 전체 스토어 구독 결함 해결: 개별 Selector 분리 구독으로 불필요 리렌더링 0% 통제
  const focusId = useGraphStore((state) => state.focusId);
  const setFocusId = useGraphStore((state) => state.setFocusId);

  // 1. 컴포넌트 마운트 시 Force layout을 1회 구동하여 둥둥 떠다니는 안정적인 배치 수렴
  useEffect(() => {
    // 에지 관계의 세기에 기반한 테마 커스텀 스타일링 적용 (Obsidian Pensive 스타일)
    const styledEdges = MOCK_GRAPH_EDGES.map((edge) => {
      const strength = edge.data?.strength ?? 1;
      return {
        ...edge,
        style: {
          stroke: "var(--border-strong)",
          strokeWidth: strength * 0.7, // 관계가 강할수록 굵은 두께 (최대 2.1px)
          opacity: 0.2 + strength * 0.13, // 관계가 강할수록 높은 선명도
        },
      };
    });

    const laidOutNodes = calculateForceLayout(MOCK_GRAPH_NODES, styledEdges, 80, { x: 300, y: 250 });
    
    setNodes(laidOutNodes);
    setEdges(styledEdges);
  }, [setNodes, setEdges]);

  // focusId 상태가 전역으로 변동될 때 노드의 focus 상태를 동기화
  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isFocused: node.id === focusId,
        },
      }))
    );
  }, [focusId, setNodes]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
      setFocusId(node.id);
    },
    [setFocusId]
  );

  return (
    <div className="h-full w-full bg-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setFocusId(null)}
        nodeTypes={nodeTypes}
        fitView
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        zoomOnDoubleClick={false}
        proOptions={PRO_OPTIONS}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.0}
          color="currentColor"
          className="text-muted-foreground/15 dark:text-muted-foreground/20"
        />
      </ReactFlow>
    </div>
  );
}
