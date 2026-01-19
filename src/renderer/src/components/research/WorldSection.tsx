import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "reactflow";
import "reactflow/dist/style.css";
import { ArrowLeft, Eraser, Plus, X } from "lucide-react";
import styles from "../../styles/components/ResearchPanel.module.css";
import { useProjectStore } from "../../stores/projectStore";
import { useTermStore } from "../../stores/termStore";

type WorldTab = "synopsis" | "terms" | "mindmap" | "drawing" | "plot";

export default function WorldSection() {
  const [subTab, setSubTab] = useState<WorldTab>("terms");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className={styles.subNavBar}>
        <div
          className={`${styles.subTab} ${subTab === "terms" ? styles.active : ""}`}
          onClick={() => setSubTab("terms")}
        >
          Terms (용어)
        </div>
        <div
          className={`${styles.subTab} ${subTab === "synopsis" ? styles.active : ""}`}
          onClick={() => setSubTab("synopsis")}
        >
          Synopsis
        </div>
        <div
          className={`${styles.subTab} ${subTab === "mindmap" ? styles.active : ""}`}
          onClick={() => setSubTab("mindmap")}
        >
          Mindmap
        </div>
        <div
          className={`${styles.subTab} ${subTab === "drawing" ? styles.active : ""}`}
          onClick={() => setSubTab("drawing")}
        >
          Map Drawing
        </div>
        <div
          className={`${styles.subTab} ${subTab === "plot" ? styles.active : ""}`}
          onClick={() => setSubTab("plot")}
        >
          Plot Board
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
  const { terms, loadTerms, createTerm, updateTerm, deleteTerm } = useTermStore();
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
        term: "New Term",
        definition: "",
        category: "general",
      });
    }
  };

  if (selectedTermId) {
    const term = terms.find((t) => t.id === selectedTermId);
    if (!term) return <div>Term not found</div>;

    return (
      <div>
        <div className={styles.detailHeader}>
          <div
            className={styles.backButton}
            onClick={() => setSelectedTermId(null)}
          >
            <ArrowLeft size={16} />
          </div>
          <span style={{ fontWeight: 600 }}>{term.term}</span>
        </div>

        <div className={styles.tableGrid}>
          <div className={styles.cellLabel}>용어</div>
          <div className={styles.cellValue}>
            <input
              className={styles.cellValueInput}
              value={term.term}
              onChange={(e) => updateTerm({ id: term.id, term: e.target.value })}
            />
          </div>
          <div className={styles.cellLabel}>정의</div>
          <div className={styles.cellValue}>
            <textarea
              className={styles.cellValueInput}
              value={term.definition || ""}
              onChange={(e) =>
                updateTerm({ id: term.id, definition: e.target.value })
              }
              style={{ minHeight: "100px" }}
            />
          </div>
          <div className={styles.cellLabel}>카테고리</div>
          <div className={styles.cellValue}>
            <input
              className={styles.cellValueInput}
              value={term.category || ""}
              onChange={(e) =>
                updateTerm({ id: term.id, category: e.target.value })
              }
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
              style={{ fontSize: "0.8em", color: "#666" }}
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
            <X size={14} />
          </button>
        </div>
      ))}
      <div
        className={styles.addCharacterCard}
        onClick={handleAddTerm}
        style={{ height: "80px" }}
      >
        <Plus size={24} />
        <span>Add Term</span>
      </div>
    </div>
  );
}

function SynopsisEditor() {
  const { currentItem: currentProject, updateProject } = useProjectStore();

  if (!currentProject) return null;

  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: 8 }}>
      <div className={styles.sectionTitle}>Project Description</div>
      <textarea
        className={styles.cellValueInput}
        style={{
          border: "1px solid var(--border-default)",
          padding: 12,
          borderRadius: 4,
          width: "100%",
          marginBottom: 16,
          minHeight: 200,
        }}
        placeholder="Project description..."
        value={currentProject.description || ""}
        onChange={(e) =>
          updateProject(currentProject.id, undefined, e.target.value)
        }
      />
    </div>
  );
}

const initialNodes: Node[] = [
  {
    id: "1",
    position: { x: 250, y: 5 },
    data: { label: "주인공 (Main)" },
    type: "input",
  },
  { id: "2", position: { x: 100, y: 100 }, data: { label: "조력자 A" } },
  { id: "3", position: { x: 400, y: 100 }, data: { label: "적대자 B" } },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true, label: "신뢰" },
  { id: "e1-3", source: "1", target: "3", label: "대립" },
];

function MindMapBoard() {
  const [nodes, , onNodesChange] = (function useNodesState(initial: Node[]) {
    const [nds, setNds] = useState(initial);
    const onNdsChange = useCallback(
      (changes: NodeChange[]) => setNds((prev) => applyNodeChanges(changes, prev)),
      [],
    );
    return [nds, setNds, onNdsChange] as const;
  })(initialNodes);

  const [edges, setEdges, onEdgesChange] = (function useEdgesState(initial: Edge[]) {
    const [eds, setEds] = useState(initial);
    const onEdsChange = useCallback(
      (changes: EdgeChange[]) => setEds((prev) => applyEdgeChanges(changes, prev)),
      [],
    );
    return [eds, setEds, onEdsChange] as const;
  })(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div
      style={{
        height: "100%",
        border: "1px solid var(--border-default)",
        borderRadius: 8,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function DrawingCanvas() {
  const canvasRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");

  const getCoords = (e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent) => {
    setIsDrawing(true);
    const { x, y } = getCoords(e);
    setCurrentPath(`M ${x} ${y}`);
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    setCurrentPath((prev) => `${prev} L ${x} ${y}`);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (currentPath) {
      setPaths((prev) => [...prev, currentPath]);
      setCurrentPath("");
    }
  };

  const clearCanvas = () => setPaths([]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: 4,
          backgroundColor: "var(--bg-element)",
          borderRadius: 4,
        }}
      >
        <button className={styles.subTab} onClick={clearCanvas}>
          <Eraser size={14} /> Clear
        </button>
        <span
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            alignSelf: "center",
          }}
        >
          Draw your world map here...
        </span>
      </div>
      <div
        style={{
          flex: 1,
          border: "1px solid var(--border-default)",
          borderRadius: 8,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <svg
          ref={canvasRef}
          style={{ width: "100%", height: "100%", cursor: "crosshair" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        >
          {paths.map((d, i) => (
            <path key={i} d={d} stroke="black" strokeWidth="2" fill="none" />
          ))}
          {currentPath && (
            <path d={currentPath} stroke="black" strokeWidth="2" fill="none" />
          )}
        </svg>
      </div>
    </div>
  );
}

function PlotBoard() {
  const columns = [
    { title: "Idea (발상)", cards: ["결말 반전 아이디어", "서브 남주 등장 시점?"] },
    {
      title: "Structuring (구조화)",
      cards: ["1막: 회귀와 자각", "2막: 갈등의 시작", "3막: 절정"],
    },
    { title: "Plotting (플롯)", cards: ["1화: 프롤로그", "2화: 만남", "3화: 계약"] },
    { title: "Visualization (시각화)", cards: ["주인공 의상 컨셉", "황궁 지도 스케치"] },
  ];

  return (
    <div className={styles.plotBoard}>
      {columns.map((col, idx) => (
        <div key={idx} className={styles.plotColumn}>
          <div className={styles.columnHeader}>{col.title}</div>
          {col.cards.map((card, cIdx) => (
            <div key={cIdx} className={styles.plotCard}>
              {card}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
