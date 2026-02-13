
import { useCallback, useMemo, useRef, useState } from "react";
import type { Edge, Node, Connection, NodeProps, ReactFlowInstance, NodeChange, EdgeChange } from "reactflow";
import ReactFlow, {
  Background,
  addEdge,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTranslation } from "react-i18next";
import { User, Image as ImageIcon } from "lucide-react";

type MindMapNodeData = { 
    label: string;
    image?: string; // Optional image URL
};

const getCssNumber = (name: string, fallback: number) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Custom Node for MindMap - Character Card Style
const CharacterNode = ({ id, data }: NodeProps<MindMapNodeData>) => {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const commitLabel = () => {
    const nextLabel = (draft ?? data.label).trim() || t("world.mindmap.newTopic");
    setNodes((nds: Node<MindMapNodeData>[]) =>
      nds.map((node: Node<MindMapNodeData>) =>
        node.id === id
          ? { ...node, data: { ...node.data, label: nextLabel } }
          : node,
      ),
    );
    setDraft(null);
    setIsEditingLabel(false);
  };

  const handleImageUpload = (url: string) => {
    setNodes((nds: Node<MindMapNodeData>[]) =>
        nds.map((node: Node<MindMapNodeData>) =>
            node.id === id
            ? { ...node, data: { ...node.data, image: url } }
            : node,
        ),
    );
  };

  return (
    <div
      className="group bg-panel border-2 border-border hover:border-accent rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col items-center min-w-[120px]"
      style={{
          width: (data.image || isEditingImage) ? 160 : "auto",
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(data.label);
        setIsEditingLabel(true);
      }}
    >
      <Handle type="target" position={Position.Top} className="bg-accent! w-3 h-3" />
      
      {/* Image Area */}
      <div 
        className="w-full aspect-square bg-element flex items-center justify-center relative overflow-hidden"
        style={{ display: (data.image || isEditingImage) ? "flex" : "block", height: (data.image || isEditingImage) ? "auto" : 40 }}
      >
          {isEditingImage ? (
               <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-panel">
                   <input 
                        className="w-full text-xs p-1 border border-border rounded mb-1 bg-element text-fg"
                        placeholder="https://..."
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = (e.target as HTMLInputElement).value;
                                if (val) handleImageUpload(val);
                                setIsEditingImage(false);
                            }
                            if (e.key === 'Escape') setIsEditingImage(false);
                        }}
                        onBlur={(e) => {
                            const val = e.target.value;
                            if (val) handleImageUpload(val);
                            setIsEditingImage(false);
                        }}
                   />
                   <span className="text-[10px] text-muted">Enter URL</span>
               </div>
          ) : data.image ? (
              <img src={data.image} alt={data.label} className="w-full h-full object-cover" />
          ) : (
             <div className="w-full h-full flex items-center justify-center text-muted/30">
                 <User className="w-6 h-6" />
             </div>
          )}
          
          {/* Hover Image Edit Button */}
          {!isEditingImage && (
            <button 
                className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingImage(true);
                }}
                title={t("world.mindmap.uploadImage")}
            >
                <ImageIcon className="w-3 h-3" />
            </button>
          )}
      </div>

      {/* Label Area */}
      <div className="p-2 w-full bg-panel border-t border-border/50">
        {isEditingLabel ? (
            <input
            className="w-full text-center border-none bg-transparent outline-none font-bold text-sm text-fg p-0"
            value={draft ?? data.label}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
                if (e.key === "Enter") commitLabel();
                if (e.key === "Escape") {
                setDraft(null);
                setIsEditingLabel(false);
                }
            }}
            autoFocus
            />
        ) : (
            <div className="font-bold text-sm text-fg text-center wrap-break-word leading-tight">{data.label}</div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="bg-accent! w-3 h-3" />
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
            style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
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
        data: { label: t("world.mindmap.newTopic") },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNodeId(newNodeId);
    },
    [setNodes, t],
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
            x: selectedNode.position.x + 200,
            y: selectedNode.position.y,
          },
          data: { label: t("world.mindmap.newTopic") },
        };
        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(newNodeId); 
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
            x: selectedNode.position.x + 150,
            y: selectedNode.position.y + 150,
          },
          data: { label: t("world.mindmap.subTopic") },
        };

        const newEdge: Edge = {
          id: `e${selectedNodeId}-${newNodeId}`,
          source: selectedNodeId,
          target: newNodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) => eds.concat(newEdge));
        setSelectedNodeId(newNodeId);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId === "root") return; 
        setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
        setEdges((eds) =>
          eds.filter(
            (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
          ),
        );
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId, nodes, setNodes, setEdges, t],
  );

  return (
    <div
      className="w-full h-full bg-app overflow-hidden outline-none relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDoubleClick={onPaneDoubleClick}
      style={{ outline: "none" }} 
    >
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 bg-panel/90 px-6 py-2 rounded-full text-xs font-medium text-fg shadow-lg pointer-events-none z-10 backdrop-blur-md border border-border flex items-center gap-4"
      >
        <div className="flex items-center gap-1.5"><span className="p-1 bg-border rounded">Click</span> Select</div>
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5"><span className="p-1 bg-border rounded">Enter</span> Sibling</div>
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5"><span className="p-1 bg-border rounded">Tab</span> Child</div>
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5"><span className="p-1 bg-border rounded">Del</span> Delete</div>
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
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--grid-line)" gap={24} size={1} />
        
        {/* Custom Controls */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-panel/90 backdrop-blur border border-border p-1.5 rounded-xl shadow-lg">
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-fg" onClick={() => flowRef.current?.zoomIn()} title="Zoom In">+</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-fg" onClick={() => flowRef.current?.zoomOut()} title="Zoom Out">-</button>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-hover text-fg" onClick={() => flowRef.current?.fitView()} title="Fit View">⛶</button>
        </div>
      </ReactFlow>
    </div>
  );
}
