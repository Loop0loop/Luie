import { useCallback } from "react";
import ReactFlow, { Background, BackgroundVariant, type Node, type Edge, useNodesState, useEdgesState } from "reactflow";
import PensiveNode from "./PensiveNode";
import type { GraphNodeData } from "../../types/graph";
import { useGraphStore } from "../../stores/graph/graphStore";

const nodeTypes = {
  pensive: PensiveNode,
};

const initialNodes: Node<GraphNodeData>[] = [
  { id: "1", type: "pensive", position: { x: 250, y: 250 }, data: { label: "Main Character", type: "character", isFocused: true } },
  { id: "2", type: "pensive", position: { x: 150, y: 150 }, data: { label: "Ally 1", type: "character" } },
  { id: "3", type: "pensive", position: { x: 350, y: 180 }, data: { label: "Antagonist", type: "character" } },
  { id: "4", type: "pensive", position: { x: 200, y: 350 }, data: { label: "Incident", type: "event" } },
  { id: "5", type: "pensive", position: { x: 300, y: 380 }, data: { label: "Location A", type: "location" } },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", style: { stroke: "var(--border-strong)", strokeWidth: 1, opacity: 0.5 } },
  { id: "e1-3", source: "1", target: "3", style: { stroke: "var(--border-strong)", strokeWidth: 1, opacity: 0.5 } },
  { id: "e1-4", source: "1", target: "4", style: { stroke: "var(--border-strong)", strokeWidth: 1, opacity: 0.5 } },
  { id: "e4-5", source: "4", target: "5", style: { stroke: "var(--border-strong)", strokeWidth: 1, opacity: 0.5 } },
];

export default function GraphSurface() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const setFocusId = useGraphStore((s) => s.setFocusId);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<GraphNodeData>) => {
    setFocusId(node.id);
  }, [setFocusId]);

  return (
    <div className="h-full w-full bg-app">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => setFocusId(null)}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="var(--text-subtle)"
          className="opacity-20"
        />
      </ReactFlow>
    </div>
  );
}
