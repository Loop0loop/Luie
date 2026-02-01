import { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
import { VirtuosoGrid } from "react-virtuoso";
import { cn } from "../../../../shared/types/utils";
import { ArrowLeft, Eraser, Plus, X, Type, PenTool } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useTermStore } from "../../stores/termStore";
import { BufferedInput, BufferedTextArea } from "../common/BufferedInput";
import {
  WORLD_MINDMAP_ROOT_LABEL,
  DEFAULT_TERM_ADD_LABEL,
  WORLD_PROJECT_SYNOPSIS_TITLE,
  WORLD_DRAW_TOOL_PEN_TITLE,
  WORLD_DRAW_TOOL_TEXT_TITLE,
  WORLD_DRAW_CLEAR_LABEL,
  WORLD_PLOT_ADD_BEAT_LABEL,
  WORLD_PLOT_NEW_BEAT_LABEL,
  PLACEHOLDER_WORLD_SYNOPSIS,
  WORLD_TAB_TERMS,
  WORLD_TAB_SYNOPSIS,
  WORLD_TAB_MINDMAP,
  WORLD_TAB_DRAWING,
  WORLD_TAB_PLOT,
  WORLD_TERM_DEFAULT_NAME,
  WORLD_TERM_DEFAULT_CATEGORY,
  WORLD_TERM_NOT_FOUND,
  WORLD_TERM_LABEL,
  WORLD_TERM_DEFINITION_LABEL,
  WORLD_TERM_CATEGORY_LABEL,
  WORLD_SYNOPSIS_HINT,
  WORLD_DRAW_PLACE_PROMPT,
  WORLD_PLOT_ACT1_TITLE,
  WORLD_PLOT_ACT2_TITLE,
  WORLD_PLOT_ACT3_TITLE,
  WORLD_PLOT_CARD_ACT1_1,
  WORLD_PLOT_CARD_ACT1_2,
  WORLD_PLOT_CARD_ACT2_1,
  WORLD_PLOT_CARD_ACT3_1,
  WORLD_MINDMAP_NEW_TOPIC,
} from "../../../../shared/constants";

type WorldTab = "synopsis" | "terms" | "mindmap" | "drawing" | "plot";

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
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    const nextLabel = (draft ?? data.label).trim() || WORLD_MINDMAP_NEW_TOPIC;
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
      className="p-2 min-w-[100px] bg-panel border-2 border-active rounded-lg shadow-sm text-center flex flex-col justify-center items-center relative transition-transform hover:shadow-md"
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

export default function WorldSection() {
  const [subTab, setSubTab] = useState<WorldTab>("terms");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="flex w-full bg-sidebar border-b border-border shrink-0 text-muted select-none">
        <div
          className={cn("flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans", subTab === "terms" && "text-accent font-semibold border-b-2 border-accent")}
          onClick={() => setSubTab("terms")}
        >
          {WORLD_TAB_TERMS}
        </div>
        <div
          className={cn("flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans", subTab === "synopsis" && "text-accent font-semibold border-b-2 border-accent")}
          onClick={() => setSubTab("synopsis")}
        >
          {WORLD_TAB_SYNOPSIS}
        </div>
        <div
          className={cn("flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans", subTab === "mindmap" && "text-accent font-semibold border-b-2 border-accent")}
          onClick={() => setSubTab("mindmap")}
        >
          {WORLD_TAB_MINDMAP}
        </div>
        <div
          className={cn("flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans", subTab === "drawing" && "text-accent font-semibold border-b-2 border-accent")}
          onClick={() => setSubTab("drawing")}
        >
          {WORLD_TAB_DRAWING}
        </div>
        <div
          className={cn("flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans", subTab === "plot" && "text-accent font-semibold border-b-2 border-accent")}
          onClick={() => setSubTab("plot")}
        >
          {WORLD_TAB_PLOT}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {subTab === "terms" && <TermManager />}
        {subTab === "synopsis" && <SynopsisEditor />}
        {subTab === "mindmap" && <MindMapBoard />}
        {subTab === "drawing" && <DrawingCanvas />}
        {subTab === "plot" && <PlotBoard />}
      </div>
    </div>
  );
}

function TermManager() {
  const { currentItem: currentProject } = useProjectStore();
  const { terms, loadTerms, createTerm, updateTerm, deleteTerm } =
    useTermStore();
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  useEffect(() => {
    if (currentProject) {
      loadTerms(currentProject.id);
    }
  }, [currentProject, loadTerms]);

  const termGridItems = useMemo(
    () => [
      ...terms.map((term) => ({ type: "term" as const, term })),
      { type: "add" as const },
    ],
    [terms],
  );

  const handleAddTerm = async () => {
    if (currentProject) {
      await createTerm({
        projectId: currentProject.id,
        term: WORLD_TERM_DEFAULT_NAME,
        definition: "",
        category: WORLD_TERM_DEFAULT_CATEGORY,
      });

      // Reload terms to reflect the new addition
      await loadTerms(currentProject.id);

      // Auto-selection is tricky without the ID returned.
      // We'll skip auto-selection or implement a store update later.
    }
  };

  if (selectedTermId) {
    const term = terms.find((t) => t.id === selectedTermId);
    if (!term) return <div>{WORLD_TERM_NOT_FOUND}</div>;

    return (
      <div className="p-4">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border">
          <div
            className="flex items-center justify-center p-1 rounded hover:bg-hover text-muted hover:text-fg transition-colors cursor-pointer"
            onClick={() => setSelectedTermId(null)}
          >
            <ArrowLeft className="icon-md" />
          </div>
          <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{term.term}</span>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-4 items-start pb-8">
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{WORLD_TERM_LABEL}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={term.term}
              onSave={(val) => updateTerm({ id: term.id, term: val })}
            />
          </div>
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{WORLD_TERM_DEFINITION_LABEL}</div>
          <div className="min-w-0">
            <BufferedTextArea
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all font-sans leading-relaxed"
              value={term.definition || ""}
              onSave={(val) => updateTerm({ id: term.id, definition: val })}
              style={{ minHeight: "100px" }}
            />
          </div>
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{WORLD_TERM_CATEGORY_LABEL}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={term.category || ""}
              onSave={(val) => updateTerm({ id: term.id, category: val })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <VirtuosoGrid
        data={termGridItems}
        style={{ height: "100%" }}
        computeItemKey={(_index, item) =>
          item.type === "term" ? item.term.id : "add"
        }
        listClassName="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 p-4"
        itemContent={(_index, item) => {
          if (item.type === "add") {
            return (
              <div
                className="h-[80px] flex flex-col items-center justify-center gap-2 border border-dashed border-border rounded-lg cursor-pointer text-muted hover:text-accent hover:border-accent hover:bg-element-hover transition-colors"
                onClick={handleAddTerm}
                style={{ height: "80px" }}
              >
                <Plus className="icon-xxl" />
                <span>{DEFAULT_TERM_ADD_LABEL}</span>
              </div>
            );
          }

          return (
            <div
              className="h-[100px] p-3 bg-element border border-border rounded-lg cursor-pointer relative shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-active overflow-hidden flex flex-col"
              onClick={() => setSelectedTermId(item.term.id)}
              style={{ height: "auto", minHeight: "80px" }}
            >
              <div className="ml-0">
                <div className="font-bold text-sm text-fg mb-1">
                  {item.term.term}
                </div>
                <div
                  className="text-xs text-secondary line-clamp-2"
                  style={{ fontSize: "0.8em", color: "var(--text-secondary)" }}
                >
                  {item.term.category ? `[${item.term.category}] ` : ""}
                  {item.term.definition || "No definition"}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTerm(item.term.id);
                }}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  opacity: 0.5,
                }}
              >
                <X className="icon-sm" />
              </button>
            </div>
          );
        }}
      />
    </div>
  );
}

function SynopsisEditor() {
  const { currentItem: currentProject, updateProject } = useProjectStore();
  const [status, setStatus] = useState<"draft" | "working" | "locked">("draft");

  if (!currentProject) return null;

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: 8 }}>
      <div
        className="text-lg font-bold text-fg"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{WORLD_PROJECT_SYNOPSIS_TITLE}</span>
        <div style={{ display: "flex", gap: 4 }}>
          {/* Status Toggles */}
          {(["draft", "working", "locked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              style={{
                fontSize: "var(--world-status-font-size)",
                padding: "2px 8px",
                borderRadius: 12,
                border:
                  "1px solid " +
                  (status === s
                    ? "var(--accent-primary)"
                    : "var(--border-default)"),
                background:
                  status === s ? "var(--accent-primary)" : "transparent",
                color: status === s ? "white" : "var(--text-tertiary)",
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <BufferedTextArea
        className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all font-sans leading-relaxed"
        style={{
          border: "1px solid var(--border-default)",
          padding: 16,
          borderRadius: 4,
          width: "100%",
          marginBottom: 16,
          minHeight: "var(--world-overview-min-height)",
          lineHeight: "var(--world-overview-line-height)",
          fontSize: "var(--world-overview-font-size)",
          backgroundColor:
            status === "locked" ? "var(--bg-secondary)" : "transparent",
          color:
            status === "locked"
              ? "var(--text-secondary)"
              : "var(--text-primary)",
        }}
        placeholder={PLACEHOLDER_WORLD_SYNOPSIS}
        value={currentProject.description || ""}
        readOnly={status === "locked"}
        onSave={(val) => updateProject(currentProject.id, undefined, val)}
      />

      <div
        style={{
          fontSize: "var(--world-hint-font-size)",
          color: "var(--text-tertiary)",
          padding: "0 4px",
        }}
      >
        {WORLD_SYNOPSIS_HINT}
      </div>
    </div>
  );
}

function MindMapBoard() {
  const nodeTypes = useMemo(() => ({ character: CharacterNode }), []);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const rootX = getCssNumber("--world-mindmap-root-x", 300);
  const rootY = getCssNumber("--world-mindmap-root-y", 300);

  // XMind-style interaction:
  // Enter -> Add Sibling
  // Tab -> Add Child

  const [nodes, setNodes] = useNodesState([
    {
      id: "root",
      type: "character",
      position: { x: rootX, y: rootY },
      data: { label: WORLD_MINDMAP_ROOT_LABEL },
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
        // Add Sibling (Same parent? Hard to know without tree structure. For now, add generic node nearby)
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
        // Add Child
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

// --- Drawing Canvas ---
interface MapPath {
  d?: string;
  type: "path" | "text";
  color: string;
  width?: number;
  x?: number;
  y?: number;
  text?: string;
}

function DrawingCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<"pen" | "text" | "eraser">("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [paths, setPaths] = useState<MapPath[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);

  const colors = [
    "#000000",
    "#ef4444",
    "#3b82f6",
    "#22c55e",
    "#eab308",
    "#a855f7",
  ];
  const widths = [2, 4, 8, 16];

  const getCoords = (e: React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === "text") {
      const { x, y } = getCoords(e);
      const text = window.prompt(WORLD_DRAW_PLACE_PROMPT);
      if (text) {
        setPaths((prev) => [...prev, { type: "text", x, y, text, color }]);
      }
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    setCurrentPath(`M ${x} ${y}`);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (currentPath) {
      setPaths((prev) => [
        ...prev,
        { type: "path", d: currentPath, color, width: lineWidth },
      ]);
      setCurrentPath("");
    }
  };

  const clearCanvas = () => setPaths([]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Drawing Toolbar */}
      <div className="h-9 flex items-center px-4 gap-4 bg-panel border-b border-border shrink-0">
        <div
          style={{
            display: "flex",
            gap: 4,
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          <button
            className={cn("w-7 h-7 flex items-center justify-center rounded text-muted hover:bg-hover hover:text-fg transition-colors", tool === "pen" && "bg-active text-accent")}
            onClick={() => setTool("pen")}
            title={WORLD_DRAW_TOOL_PEN_TITLE}
          >
            <PenTool className="icon-md" />
          </button>
          <button
            className={cn("w-7 h-7 flex items-center justify-center rounded text-muted hover:bg-hover hover:text-fg transition-colors", tool === "text" && "bg-active text-accent")}
            onClick={() => setTool("text")}
            title={WORLD_DRAW_TOOL_TEXT_TITLE}
          >
            <Type className="icon-md" />
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          {colors.map((c) => (
            <div
              key={c}
              className={cn("w-5 h-5 rounded-full border border-border cursor-pointer hover:scale-110 transition-transform", color === c && "ring-2 ring-active ring-offset-2 ring-offset-panel")}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          {widths.map((w) => (
            <div
              key={w}
              onClick={() => setLineWidth(w)}
              style={{
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: lineWidth === w ? 1 : 0.4,
              }}
            >
              <div
                style={{
                  width: w,
                  height: w,
                  borderRadius: "50%",
                  background: "var(--text-primary)",
                }}
              />
            </div>
          ))}
        </div>

        <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-hover text-xs cursor-pointer text-muted hover:text-fg transition-colors" onClick={clearCanvas}>
          <Eraser className="icon-sm" /> {WORLD_DRAW_CLEAR_LABEL}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 bg-app cursor-crosshair overflow-hidden" ref={canvasRef}>
        <svg
          style={{ width: "100%", height: "100%", touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {paths.map((p, i) => {
            if (p.type === "text") {
              return (
                <text
                  key={i}
                  x={p.x}
                  y={p.y}
                  fill={p.color}
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    fontSize: "var(--world-draw-text-font-size)",
                    fontWeight: "var(--world-draw-text-font-weight)",
                  }}
                >
                  {p.text}
                </text>
              );
            }
            return (
              <path
                key={i}
                d={p.d}
                stroke={p.color}
                strokeWidth={p.width}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {currentPath && (
            <path
              d={currentPath}
              stroke={color}
              strokeWidth={lineWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </div>
    </div>
  );
}

function PlotBoard() {
  const [columns, setColumns] = useState([
    {
      id: "act1",
      title: WORLD_PLOT_ACT1_TITLE,
      cards: [
        { id: "c1", content: WORLD_PLOT_CARD_ACT1_1 },
        { id: "c2", content: WORLD_PLOT_CARD_ACT1_2 },
      ],
    },
    {
      id: "act2",
      title: WORLD_PLOT_ACT2_TITLE,
      cards: [{ id: "c3", content: WORLD_PLOT_CARD_ACT2_1 }],
    },
    {
      id: "act3",
      title: WORLD_PLOT_ACT3_TITLE,
      cards: [{ id: "c4", content: WORLD_PLOT_CARD_ACT3_1 }],
    },
  ]);

  const addCard = (colId: string) => {
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: [
              ...col.cards,
              { id: Date.now().toString(), content: WORLD_PLOT_NEW_BEAT_LABEL },
            ],
          };
        }
        return col;
      }),
    );
  };

  const updateCard = (colId: string, cardId: string, content: string) => {
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.map((c) =>
              c.id === cardId ? { ...c, content } : c,
            ),
          };
        }
        return col;
      }),
    );
  };

  const deleteCard = (colId: string, cardId: string) => {
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          };
        }
        return col;
      }),
    );
  };

  return (
    <div className="h-full flex overflow-x-auto p-4 gap-4 bg-app">
      {columns.map((col) => (
        <div key={col.id} className="w-[280px] shrink-0 flex flex-col bg-sidebar border border-border rounded-lg max-h-full">
          <div className="p-3 font-bold text-sm text-fg uppercase flex justify-between items-center border-b border-border bg-panel/50">
            {col.title}
            <span className="bg-element/80 px-1.5 py-0.5 rounded text-[10px] text-muted">{col.cards.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {col.cards.map((card) => (
              <div key={card.id} className="bg-panel border border-border rounded p-2 shadow-sm relative group hover:border-active transition-colors">
                <BufferedTextArea
                  className="w-full bg-transparent border-none resize-none text-sm text-fg leading-relaxed outline-none mb-1"
                  value={card.content}
                  onSave={(val) => updateCard(col.id, card.id, val)}
                  rows={2}
                />
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-hover text-muted hover:text-error transition-all"
                  onClick={() => deleteCard(col.id, card.id)}
                >
                  <X className="icon-xs" />
                </button>
              </div>
            ))}
          </div>
          <button className="m-2 p-2 flex items-center justify-center gap-1.5 rounded border border-dashed border-border text-xs text-muted hover:text-accent hover:border-accent hover:bg-element-hover transition-all" onClick={() => addCard(col.id)}>
            <Plus className="icon-sm" /> {WORLD_PLOT_ADD_BEAT_LABEL}
          </button>
        </div>
      ))}
    </div>
  );
}
