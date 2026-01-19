import { useState, useCallback, useRef, useEffect } from "react";
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
import "reactflow/dist/style.css";
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
import { useCharacterStore } from "../../stores/characterStore";
import { useProjectStore } from "../../stores/projectStore";
import { useTermStore } from "../../stores/termStore";

interface ResearchPanelProps {
  activeTab: string; // 'character' | 'world' | 'scrap'
  onClose: () => void;
}

type WorldTab = "synopsis" | "terms" | "mindmap" | "drawing" | "plot";

export default function ResearchPanel({
  activeTab,
  onClose,
}: ResearchPanelProps) {
  const getTitle = () => {
    switch (activeTab) {
      case "character":
        return "Characters";
      case "world":
        return "World";
      case "scrap":
        return "Scrap";
      default:
        return "Research";
    }
  };

/* -------------------------------------------------------------------------- */
/*                                WORLD TAB                                   */
/* -------------------------------------------------------------------------- */

function WorldSection() {
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
  const {
    terms,
    loadTerms,
    createTerm,
    updateTerm,
    deleteTerm
  } = useTermStore();
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
    const term = terms.find(t => t.id === selectedTermId);
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
              onChange={(e) => updateTerm({ id: term.id, definition: e.target.value })}
              style={{ minHeight: "100px" }}
            />
          </div>
          <div className={styles.cellLabel}>카테고리</div>
          <div className={styles.cellValue}>
            <input
              className={styles.cellValueInput}
              value={term.category || ""}
              onChange={(e) => updateTerm({ id: term.id, category: e.target.value })}
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
          style={{ height: 'auto', minHeight: '80px' }}
        >
          <div className={styles.characterInfo} style={{ marginLeft: 0 }}>
            <div className={styles.characterName}>{term.term}</div>
            <div className={styles.characterRole} style={{ fontSize: '0.8em', color: '#666' }}>
              {term.category ? `[${term.category}] ` : ''}{term.definition || "No definition"}
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              deleteTerm(term.id);
            }}
            style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.5 }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <div className={styles.addCharacterCard} onClick={handleAddTerm} style={{ height: '80px' }}>
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
        onChange={(e) => updateProject(currentProject.id, undefined, e.target.value)}
      />
    </div>
  );
  }

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
function CharacterManager() {
  const { currentItem: currentProject } = useProjectStore();
  const {
    items: characters,
    loadAll: loadCharacters,
    create: createCharacter,
  } = useCharacterStore();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (currentProject) {
      loadCharacters(currentProject.id);
    }
  }, [currentProject, loadCharacters]);

  const handleAddCharacter = async () => {
    if (currentProject) {
      await createCharacter({
        projectId: currentProject.id,
        name: "New Character",
        description: "",
      });
    }
  };

  if (selectedCharacterId) {
    const selectedChar = characters.find((c) => c.id === selectedCharacterId);
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
            {selectedChar?.name || "Character"}
          </span>
        </div>
        {selectedChar && <CharacterProfile character={selectedChar} />}
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
            style={{
              borderBottom: `4px solid ${char.attributes ? JSON.parse(char.attributes as string).color || "#ccc" : "#ccc"}`,
            }}
          >
            <User size={32} opacity={0.5} />
          </div>
          <div className={styles.characterInfo}>
            <div className={styles.characterName}>{char.name}</div>
            <div className={styles.characterRole}>
              {char.description || "No description"}
            </div>
          </div>
        </div>
      ))}
      <div className={styles.addCharacterCard} onClick={handleAddCharacter}>
        <Plus size={24} />
        <span>Add Character</span>
      </div>
    </div>
  );
}

function CharacterProfile({ character }: { character: any }) {
  const { update: updateCharacter } = useCharacterStore();
  const attributes = character.attributes
    ? JSON.parse(character.attributes)
    : {};

  const handleUpdate = (field: string, value: string) => {
    updateCharacter({
      id: character.id,
      [field]: value,
    });
  };

  const handleAttributeUpdate = (key: string, value: string) => {
    const newAttributes = { ...attributes, [key]: value };
    updateCharacter({
      id: character.id,
      attributes: newAttributes,
    });
  };

  return (
    <div>
      <div className={styles.sectionTitle}>기본 프로필 (Basic Profile)</div>
      <div className={styles.tableGrid}>
        <div className={styles.cellLabel}>이름</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={character.name}
            onChange={(e) => handleUpdate("name", e.target.value)}
          />
        </div>
        <div className={styles.cellLabel}>설명</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={character.description || ""}
            onChange={(e) => handleUpdate("description", e.target.value)}
          />
        </div>
        <div className={styles.cellLabel}>성별</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={attributes.gender || ""}
            onChange={(e) => handleAttributeUpdate("gender", e.target.value)}
          />
        </div>
        <div className={styles.cellLabel}>나이</div>
        <div className={styles.cellValue}>
          <input
            className={styles.cellValueInput}
            value={attributes.age || ""}
            onChange={(e) => handleAttributeUpdate("age", e.target.value)}
          />
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
