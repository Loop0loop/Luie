
import { useCallback, useMemo, useRef, useState } from "react";
import type { Edge, Node, Connection, NodeProps, ReactFlowInstance, NodeChange, EdgeChange } from "reactflow";
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTranslation } from "react-i18next";

type MindMapNodeData = { label: string };

const getCssNumber = (name: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Custom Node for MindMap
const CharacterNode = ({ id, data }: NodeProps<MindMapNodeData>) => {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const nextLabel = (draft ?? data.label).trim() || t("world.mindmap.newTopic");
    setNodes((nds: Node<MindMapNodeData>[]) =>
      nds.map((node: Node<MindMapNodeData>) =>
        node.id === id
          ? { ...node, data: { ...node.data, label: nextLabel } }
          : node,
      ),
    );
    setDraft(null);
    setIsEditing(false);
  };

  return (
    <div
      className="p-2 min-w-25 bg-panel border-2 border-active rounded-lg shadow-sm text-center flex flex-col justify-center items-center relative transition-transform hover:shadow-md"
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(data.label);
        setIsEditing(true);
      }}
    >
      <Handle type="target" position={Position.Top} />
      {isEditing ? (
        <input
          className="w-full text-center border-none bg-transparent outline-none font-medium text-sm text-fg"
          value={draft ?? data.label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(null);
              setIsEditing(false);
            }
          }}
          autoFocus
        />
      ) : (
        <div className="font-medium text-sm text-fg break-normal whitespace-pre-wrap">{data.label}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export function MindMapBoard() {
  const { t } = useTranslation();
  const nodeTypes = useMemo(() => ({ character: CharacterNode }), []);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const rootX = getCssNumber("--world-mindmap-root-x", 300);
  const rootY = getCssNumber("--world-mindmap-root-y", 300);

  const [nodes, setNodes] = useNodesState([
    {
      id: "root",
      type: "character",
      position: { x: rootX, y: rootY },
      data: { label: t("world.mindmap.rootLabel") },
    },
  ]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const pendingNodeChangesRef = useRef<NodeChange[]>([]);
  const pendingEdgeChangesRef = useRef<EdgeChange[]>([]);
  const rafNodesRef = useRef<number | null>(null);
  const rafEdgesRef = useRef<number | null>(null);

  const flushNodeChanges = useCallback(() => {
    rafNodesRef.current = null;
    if (pendingNodeChangesRef.current.length === 0) return;
    const changes = pendingNodeChangesRef.current;
    pendingNodeChangesRef.current = [];
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, [setNodes]);

  const flushEdgeChanges = useCallback(() => {
    rafEdgesRef.current = null;
    if (pendingEdgeChangesRef.current.length === 0) return;
    const changes = pendingEdgeChangesRef.current;
    pendingEdgeChangesRef.current = [];
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, [setEdges]);

  const onNodesChangeBatched = useCallback(
    (changes: NodeChange[]) => {
      pendingNodeChangesRef.current.push(...changes);
      if (rafNodesRef.current === null) {
        rafNodesRef.current = window.requestAnimationFrame(flushNodeChanges);
      }
    },
    [flushNodeChanges],
  );

  const onEdgesChangeBatched = useCallback(
    (changes: EdgeChange[]) => {
      pendingEdgeChangesRef.current.push(...changes);
      if (rafEdgesRef.current === null) {
        rafEdgesRef.current = window.requestAnimationFrame(flushEdgeChanges);
      }
    },
    [flushEdgeChanges],
  );


  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
      const instance = flowRef.current;
      if (!instance) return;

      const position = instance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNodeId = Date.now().toString();
      const newNode: Node<MindMapNodeData> = {
        id: newNodeId,
        type: "character",
        position,
        data: { label: "New Topic" },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNodeId);
    },
    [setNodes],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedNodeId) return;

      if (e.key === "Enter") {
        e.preventDefault();
        const selectedNode = nodes.find((n) => n.id === selectedNodeId);
        if (!selectedNode) return;

        const newNodeId = Date.now().toString();
        const newNode: Node = {
          id: newNodeId,
          type: "character",
          position: {
            x: selectedNode.position.x + 150,
            y: selectedNode.position.y,
          },
          data: { label: "New Topic" },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(newNodeId); // Auto select new node
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const selectedNode = nodes.find((n) => n.id === selectedNodeId);
        if (!selectedNode) return;

        const newNodeId = Date.now().toString();
        const newNode: Node = {
          id: newNodeId,
          type: "character",
          position: {
            x: selectedNode.position.x + 100,
            y: selectedNode.position.y + 100,
          },
          data: { label: "Sub Topic" },
        };

        const newEdge: Edge = {
          id: `e${selectedNodeId}-${newNodeId}`,
          source: selectedNodeId,
          target: newNodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat(newEdge));
        setSelectedNodeId(newNodeId);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId === "root") return; // Protect root
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) =>
          eds.filter(
            (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
          ),
        );
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId, nodes, setNodes, setEdges],
  );

  return (
    <div
      className="w-full h-full bg-app overflow-hidden outline-none relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDoubleClick={onPaneDoubleClick}
      style={{ outline: "none" }} // Focusable div for keyboard events
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-panel/80 px-4 py-1.5 rounded-full text-xs text-secondary shadow-sm pointer-events-none z-10 backdrop-blur-sm border border-border"
      >
        Click Node to Select • <b>Enter</b>: Sibling • <b>Tab</b>: Child •{" "}
        <b>Del</b>: Delete • <b>Double Click</b>: Edit/Insert
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeBatched}
        onEdgesChange={onEdgesChangeBatched}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        fitView
        onInit={(instance) => {
          flowRef.current = instance;
        }}
      >
        <Background color="var(--grid-line)" gap={20} />
        <MiniMap
          nodeColor={() => "var(--bg-element)"}
          nodeStrokeColor={() => "var(--border-active)"}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
