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
import { ArrowLeft, Eraser, Plus, X, Type, PenTool } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";
import { useProjectStore } from "../../stores/projectStore";
import { useTermStore } from "../../stores/termStore";
import { BufferedInput, BufferedTextArea } from "../common/BufferedInput";
import {
  WORLD_MINDMAP_ROOT_LABEL,
  WORLD_MINDMAP_ROOT_X,
  WORLD_MINDMAP_ROOT_Y,
  WORLD_OVERVIEW_FONT_SIZE,
  WORLD_OVERVIEW_LINE_HEIGHT,
  WORLD_OVERVIEW_MIN_HEIGHT,
  WORLD_STATUS_FONT_SIZE,
  WORLD_HINT_FONT_SIZE,
  FONT_WEIGHT_SEMIBOLD,
  DEFAULT_TERM_ADD_LABEL,
  WORLD_PROJECT_SYNOPSIS_TITLE,
  ICON_SIZE_MD,
  ICON_SIZE_SM,
  ICON_SIZE_XS,
  WORLD_DRAW_TOOL_PEN_TITLE,
  WORLD_DRAW_TOOL_TEXT_TITLE,
  WORLD_DRAW_CLEAR_LABEL,
  WORLD_DRAW_TEXT_FONT_SIZE,
  WORLD_DRAW_TEXT_FONT_WEIGHT,
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
      className={styles.mindMapNode}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setDraft(data.label);
        setIsEditing(true);
      }}
    >
      <Handle type="target" position={Position.Top} />
      {isEditing ? (
        <input
          className={`${styles.mindMapNodeInput} nodrag`}
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
        <div className={styles.mindMapNodeLabel}>{data.label}</div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default function WorldSection() {
  const [subTab, setSubTab] = useState<WorldTab>("terms");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className={styles.subNavBar}>
        <div
          className={`${styles.subTab} ${subTab === "terms" ? styles.active : ""}`}
          onClick={() => setSubTab("terms")}
        >
          {WORLD_TAB_TERMS}
        </div>
        <div
          className={`${styles.subTab} ${subTab === "synopsis" ? styles.active : ""}`}
          onClick={() => setSubTab("synopsis")}
        >
          {WORLD_TAB_SYNOPSIS}
        </div>
        <div
          className={`${styles.subTab} ${subTab === "mindmap" ? styles.active : ""}`}
          onClick={() => setSubTab("mindmap")}
        >
          {WORLD_TAB_MINDMAP}
        </div>
        <div
          className={`${styles.subTab} ${subTab === "drawing" ? styles.active : ""}`}
          onClick={() => setSubTab("drawing")}
        >
          {WORLD_TAB_DRAWING}
        </div>
        <div
          className={`${styles.subTab} ${subTab === "plot" ? styles.active : ""}`}
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
      <div>
        <div className={styles.detailHeader}>
          <div
            className={styles.backButton}
            onClick={() => setSelectedTermId(null)}
          >
            <ArrowLeft size={ICON_SIZE_MD} />
          </div>
          <span style={{ fontWeight: FONT_WEIGHT_SEMIBOLD }}>{term.term}</span>
        </div>

        <div className={styles.tableGrid}>
          <div className={styles.cellLabel}>{WORLD_TERM_LABEL}</div>
          <div className={styles.cellValue}>
            <BufferedInput
              className={styles.cellValueInput}
              value={term.term}
              onSave={(val) => updateTerm({ id: term.id, term: val })}
            />
          </div>
          <div className={styles.cellLabel}>{WORLD_TERM_DEFINITION_LABEL}</div>
          <div className={styles.cellValue}>
            <BufferedTextArea
              className={styles.cellValueInput}
              value={term.definition || ""}
              onSave={(val) => updateTerm({ id: term.id, definition: val })}
              style={{ minHeight: "100px" }}
            />
          </div>
          <div className={styles.cellLabel}>{WORLD_TERM_CATEGORY_LABEL}</div>
          <div className={styles.cellValue}>
            <BufferedInput
              className={styles.cellValueInput}
              value={term.category || ""}
              onSave={(val) => updateTerm({ id: term.id, category: val })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.characterListContainer}>
      {terms.map((term) => (
        <div
          key={term.id}
          className={styles.characterCard}
          onClick={() => setSelectedTermId(term.id)}
          style={{ height: "auto", minHeight: "80px" }}
        >
          <div className={styles.characterInfo} style={{ marginLeft: 0 }}>
            <div className={styles.characterName}>{term.term}</div>
            <div
              className={styles.characterRole}
              style={{ fontSize: "0.8em", color: "var(--text-secondary)" }}
            >
              {term.category ? `[${term.category}] ` : ""}
              {term.definition || "No definition"}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteTerm(term.id);
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
            <X size={ICON_SIZE_SM} />
          </button>
        </div>
      ))}
      <div
        className={styles.addCharacterCard}
        onClick={handleAddTerm}
        style={{ height: "80px" }}
      >
        <Plus size={WORLD_ADD_TERM_ICON_SIZE} />
        <span>{DEFAULT_TERM_ADD_LABEL}</span>
      </div>
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
        className={styles.sectionTitle}
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
                fontSize: WORLD_STATUS_FONT_SIZE,
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
        className={styles.cellValueInput}
        style={{
          border: "1px solid var(--border-default)",
          padding: 16,
          borderRadius: 4,
          width: "100%",
          marginBottom: 16,
          minHeight: WORLD_OVERVIEW_MIN_HEIGHT,
          lineHeight: WORLD_OVERVIEW_LINE_HEIGHT,
          fontSize: WORLD_OVERVIEW_FONT_SIZE,
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
          fontSize: WORLD_HINT_FONT_SIZE,
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

  // XMind-style interaction:
  // Enter -> Add Sibling
  // Tab -> Add Child

  const [nodes, setNodes] = useNodesState([
    {
      id: "root",
      type: "character",
      position: { x: WORLD_MINDMAP_ROOT_X, y: WORLD_MINDMAP_ROOT_Y },
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
      className={styles.mindMapContainer}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onDoubleClick={onPaneDoubleClick}
      style={{ outline: "none" }} // Focusable div for keyboard events
    >
      <div
        className={styles.mindMapHint}
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
      <div className={styles.drawingToolbar}>
        <div
          style={{
            display: "flex",
            gap: 4,
            paddingRight: 12,
            borderRight: "1px solid var(--border-default)",
          }}
        >
          <button
            className={`${styles.toolButton} ${tool === "pen" ? styles.active : ""}`}
            onClick={() => setTool("pen")}
            title={WORLD_DRAW_TOOL_PEN_TITLE}
          >
            <PenTool size={ICON_SIZE_MD} />
          </button>
          <button
            className={`${styles.toolButton} ${tool === "text" ? styles.active : ""}`}
            onClick={() => setTool("text")}
            title={WORLD_DRAW_TOOL_TEXT_TITLE}
          >
            <Type size={ICON_SIZE_MD} />
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
              className={`${styles.colorSwatch} ${color === c ? styles.active : ""}`}
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

        <button className={styles.subTab} onClick={clearCanvas}>
          <Eraser size={ICON_SIZE_SM} /> {WORLD_DRAW_CLEAR_LABEL}
        </button>
      </div>

      {/* Canvas */}
      <div className={styles.canvasArea} ref={canvasRef}>
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
                  fontSize={String(WORLD_DRAW_TEXT_FONT_SIZE)}
                  fontWeight={WORLD_DRAW_TEXT_FONT_WEIGHT}
                  style={{ userSelect: "none", pointerEvents: "none" }}
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
    <div className={styles.plotBoard}>
      {columns.map((col) => (
        <div key={col.id} className={styles.plotColumn}>
          <div className={styles.columnHeader}>
            {col.title}
            <span className={styles.cardCount}>{col.cards.length}</span>
          </div>
          <div className={styles.cardList}>
            {col.cards.map((card) => (
              <div key={card.id} className={styles.plotCard}>
                <BufferedTextArea
                  className={styles.cardInput}
                  value={card.content}
                  onSave={(val) => updateCard(col.id, card.id, val)}
                  rows={2}
                />
                <button
                  className={styles.cardDeleteBtn}
                  onClick={() => deleteCard(col.id, card.id)}
                >
                  <X size={ICON_SIZE_XS} />
                </button>
              </div>
            ))}
          </div>
          <button className={styles.addCardBtn} onClick={() => addCard(col.id)}>
            <Plus size={ICON_SIZE_SM} /> {WORLD_PLOT_ADD_BEAT_LABEL}
          </button>
        </div>
      ))}
    </div>
  );
}
