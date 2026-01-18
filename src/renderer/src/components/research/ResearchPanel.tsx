import { useState, useCallback, useRef } from "react";
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
} from "reactflow";
import "reactflow/dist/style.css"; // Import ReactFlow styles
import styles from "../../styles/components/ResearchPanel.module.css";
import {
  User,
  Globe,
  StickyNote,
  X,
  Plus,
  ArrowLeft,
  Eraser,
} from "lucide-react";

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'world' | 'scrap'
  onClose: () => void;
}

type WorldTab = "synopsis" | "mindmap" | "drawing" | "plot";

export default function ResearchPanel({
  activeTab,
  onClose,
}: ResearchPanelProps) {
  const getTitle = () => {
    switch (activeTab) {
      case "character":
        return "Character Management";
      case "world":
        return "World Construction";
      case "scrap":
        return "Memo & Notes";
      default:
        return "Research";
    }
  };

  const getIcon = () => {
    switch (activeTab) {
      case "character":
        return <User size={18} />;
      case "world":
        return <Globe size={18} />;
      case "scrap":
        return <StickyNote size={18} />;
      default:
        return <User size={18} />;
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          {getIcon()}
          <span>{getTitle()}</span>
        </div>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close Panel"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === "character" && <CharacterManager />}
        {activeTab === "world" && <WorldSection />}
        {activeTab === "scrap" && <MemoSection />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            CHARACTER SECTION                               */
/* -------------------------------------------------------------------------- */
// (Keeping Character Manager Logic same as before for stability)
function CharacterManager() {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );
  const characters = [
    { id: "1", name: "카이란 알렉산더", role: "주인공 (남)", color: "#FF5555" },
    {
      id: "2",
      name: "엘리제 드 클로로",
      role: "주인공 (여)",
      color: "#55AAFF",
    },
  ];

  if (selectedCharacterId) {
    return (
      <div>
        <div className={styles.detailHeader}>
          <div
            className={styles.backButton}
            onClick={() => setSelectedCharacterId(null)}
          >
            <ArrowLeft size={16} />
          </div>
          <span style={{ fontWeight: 600 }}>
            {selectedCharacterId === "new"
              ? "New Character"
              : characters.find((c) => c.id === selectedCharacterId)?.name}
          </span>
        </div>
        <CharacterProfile />
      </div>
    );
  }

  return (
    <div className={styles.characterListContainer}>
      {characters.map((char) => (
        <div
          key={char.id}
          className={styles.characterCard}
          onClick={() => setSelectedCharacterId(char.id)}
        >
          <div
            className={styles.characterImagePlaceholder}
            style={{ borderBottom: `4px solid ${char.color}` }}
          >
            <User size={32} opacity={0.5} />
          </div>
          <div className={styles.characterInfo}>
            <div className={styles.characterName}>{char.name}</div>
            <div className={styles.characterRole}>{char.role}</div>
          </div>
        </div>
      ))}
      <div
        className={styles.addCharacterCard}
        onClick={() => setSelectedCharacterId("new")}
      >
        <Plus size={24} />
        <span>Add Character</span>
      </div>
    </div>
  );
}

function CharacterProfile() {
  return (
    <div>
      <div className={styles.sectionTitle}>기본 프로필 (Basic Profile)</div>
      <div className={styles.tableGrid}>
        <div className={styles.cellLabel}>이름</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            defaultValue="카이란 알렉산더"
          />
        </div>
        <div className={styles.cellLabel}>성별</div>
        <div className={styles.cellValue}>
          <input className={styles.cellValueInput} defaultValue="남성" />
        </div>
        <div className={styles.cellLabel}>나이</div>
        <div className={styles.cellValue}>
          <input className={styles.cellValueInput} defaultValue="24세" />
        </div>
        <div className={styles.cellLabel}>직업</div>
        <div className={styles.cellValue}>
          <input className={styles.cellValueInput} defaultValue="황태자" />
        </div>
      </div>
      <div className={styles.sectionTitle}>상세 설정</div>
      <div
        className={styles.tableGrid}
        style={{ gridTemplateColumns: "100px 1fr" }}
      >
        <div className={styles.cellLabel}>성격</div>
        <div className={styles.cellValue}>
          <input className={styles.cellValueInput} defaultValue="냉철함" />
        </div>
        <div className={styles.cellLabel}>서사</div>
        <div className={styles.cellValue}>
          <textarea
            className={styles.cellValueInput}
            defaultValue="황위 계승 전쟁..."
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                WORLD TAB                                   */
/* -------------------------------------------------------------------------- */

function WorldSection() {
  const [subTab, setSubTab] = useState<WorldTab>("synopsis");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className={styles.subNavBar}>
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
        {subTab === "synopsis" && <SynopsisEditor />}
        {subTab === "mindmap" && <MindMapBoard />}
        {subTab === "drawing" && <DrawingCanvas />}
        {subTab === "plot" && <PlotBoard />}
      </div>
    </div>
  );
}

function SynopsisEditor() {
  return (
    <div style={{ height: "100%", overflowY: "auto", paddingRight: 8 }}>
      <div className={styles.sectionTitle}>Core Premise (로그라인)</div>
      <textarea
        className={styles.cellValueInput}
        style={{
          border: "1px solid var(--border-default)",
          padding: 12,
          borderRadius: 4,
          width: "100%",
          marginBottom: 16,
        }}
        placeholder="단 한 줄로 이 소설을 설명한다면?"
        defaultValue="폭군 황태자를 길들이기 위해 3번의 회귀를 거친 엘리제. 이번 생은 다를 수 있을까?"
      />

      <div className={styles.sectionTitle}>Synopsis (기획의도 & 줄거리)</div>
      <textarea
        className={styles.cellValueInput}
        style={{
          border: "1px solid var(--border-default)",
          padding: 12,
          borderRadius: 4,
          width: "100%",
          minHeight: 400,
        }}
        placeholder="# 기획의도&#13;&#10;...&#13;&#10;&#13;&#10;# 전체 줄거리&#13;&#10;1. 기 (소개)&#13;&#10;2. 승 (전개)&#13;&#10;3. 전 (위기/절정)&#13;&#10;4. 결 (결말)"
      />
    </div>
  );
}

// ReactFlow MindMap
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
      (changes: NodeChange[]) =>
        setNds((nds) => applyNodeChanges(changes, nds)),
      [],
    );
    return [nds, setNds, onNdsChange] as const;
  })(initialNodes);

  const [edges, setEdges, onEdgesChange] = (function useEdgesState(
    initial: Edge[],
  ) {
    const [eds, setEds] = useState(initial);
    const onEdsChange = useCallback(
      (changes: EdgeChange[]) =>
        setEds((eds) => applyEdgeChanges(changes, eds)),
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

// Simple Drawing Canvas
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
      setPaths([...paths, currentPath]);
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
    {
      title: "Idea (발상)",
      cards: ["결말 반전 아이디어", "서브 남주 등장 시점?"],
    },
    {
      title: "Structuring (구조화)",
      cards: ["1막: 회귀와 자각", "2막: 갈등의 시작", "3막: 절정"],
    },
    {
      title: "Plotting (플롯)",
      cards: ["1화: 프롤로그", "2화: 만남", "3화: 계약"],
    },
    {
      title: "Visualization (시각화)",
      cards: ["주인공 의상 컨셉", "황궁 지도 스케치"],
    },
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

/* -------------------------------------------------------------------------- */
/*                                MEMO TAB                                    */
/* -------------------------------------------------------------------------- */

import { Search, Tag, Clock } from "lucide-react";

function MemoSection() {
  const [notes, setNotes] = useState([
    {
      id: "1",
      title: "참고자료: 중세 복식",
      content:
        "링크: https://wiki...\n\n중세 귀족들의 의상은 생각보다 화려했다...",
      tags: ["자료", "의상"],
      updatedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "아이디어 파편",
      content:
        "- 주인공이 사실은 악역이었다면?\n- 회귀 전의 기억이 왜곡된 것이라면?",
      tags: ["아이디어", "플롯"],
      updatedAt: new Date().toISOString(),
    },
  ]);
  const [activeNoteId, setActiveNoteId] = useState("1");
  const [searchTerm, setSearchTerm] = useState("");

  const activeNote = notes.find((n) => n.id === activeNoteId);
  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.content.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleAddNote = () => {
    const newId = String(notes.length + 1);
    const newNote = {
      id: newId,
      title: "새로운 메모",
      content: "",
      tags: [],
      updatedAt: new Date().toISOString(),
    };
    setNotes([...notes, newNote]);
    setActiveNoteId(newId);
  };

  return (
    <div className={styles.scrapContainer}>
      <div className={styles.noteList}>
        <div className={styles.noteListHeader}>
          <span>MEMOS</span>
          <Plus
            size={14}
            style={{ cursor: "pointer" }}
            onClick={handleAddNote}
          />
        </div>

        {/* Search Bar */}
        <div
          style={{
            padding: "8px 12px",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "var(--bg-element)",
              padding: "6px 8px",
              borderRadius: 4,
            }}
          >
            <Search size={12} color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12,
                width: "100%",
                color: "var(--text-primary)",
              }}
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredNotes.map((note) => (
          <div
            key={note.id}
            className={`${styles.noteItem} ${activeNoteId === note.id ? styles.active : ""}`}
            onClick={() => setActiveNoteId(note.id)}
          >
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {note.title || "Untitled"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              {note.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 9,
                    padding: "2px 4px",
                    background: "var(--bg-element-hover)",
                    borderRadius: 2,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "var(--text-tertiary)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Clock size={8} />
              {new Date(note.updatedAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {activeNote ? (
        <div className={styles.noteContent}>
          {/* Metadata Header */}
          <div
            style={{
              padding: "12px 24px 0 24px",
              display: "flex",
              gap: 8,
              alignItems: "center",
            }}
          >
            <Tag size={14} color="var(--text-tertiary)" />
            <input
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12,
                color: "var(--text-secondary)",
                width: "100%",
              }}
              placeholder="Add tags (comma separated)..."
              value={activeNote.tags.join(", ")}
              onChange={(e) => {
                const tags = e.target.value.split(",").map((t) => t.trim());
                setNotes(
                  notes.map((n) =>
                    n.id === activeNoteId ? { ...n, tags } : n,
                  ),
                );
              }}
            />
          </div>

          <input
            className={styles.noteTitleInput}
            value={activeNote.title}
            onChange={(e) =>
              setNotes(
                notes.map((n) =>
                  n.id === activeNoteId
                    ? {
                        ...n,
                        title: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }
                    : n,
                ),
              )
            }
            placeholder="Title"
          />
          <textarea
            className={styles.noteBodyInput}
            value={activeNote.content}
            onChange={(e) =>
              setNotes(
                notes.map((n) =>
                  n.id === activeNoteId
                    ? {
                        ...n,
                        content: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }
                    : n,
                ),
              )
            }
            placeholder="Start typing your memo..."
          />
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
          }}
        >
          Select a note to view
        </div>
      )}
    </div>
  );
}
