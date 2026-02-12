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
// import { VirtuosoGrid } from "react-virtuoso"; // Replaced by standard grid for DnD
import { cn } from "../../../../shared/types/utils";
import { ArrowLeft, Eraser, Plus, X, Type, PenTool } from "lucide-react";
import { useProjectStore } from "../../stores/projectStore";
import { useTermStore } from "../../stores/termStore";
import { useUIStore } from "../../stores/uiStore";
import { BufferedInput, BufferedTextArea } from "../common/BufferedInput";
import TabButton from "../common/TabButton";
import { useTranslation } from "react-i18next";
import { useShortcutCommand } from "../../hooks/useShortcutCommand";
import {
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS as dndCSS } from '@dnd-kit/utilities';
import type { Term } from "../../../../shared/types";
import type { TFunction } from "i18next";

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

export default function WorldSection() {
  const { t } = useTranslation();
  const { worldTab, setWorldTab } = useUIStore();

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="flex w-full bg-sidebar border-b border-border shrink-0 text-muted select-none">
        <TabButton
          label={t("world.tab.terms")}
          active={worldTab === "terms"}
          onClick={() => setWorldTab("terms")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.synopsis")}
          active={worldTab === "synopsis"}
          onClick={() => setWorldTab("synopsis")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.mindmap")}
          active={worldTab === "mindmap"}
          onClick={() => setWorldTab("mindmap")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.drawing")}
          active={worldTab === "drawing"}
          onClick={() => setWorldTab("drawing")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
        <TabButton
          label={t("world.tab.plot")}
          active={worldTab === "plot"}
          onClick={() => setWorldTab("plot")}
          className="flex-1 py-1.5 text-xs text-center cursor-pointer font-medium hover:text-fg hover:bg-element-hover transition-colors font-sans"
          activeClassName="text-accent font-semibold border-b-2 border-accent"
        />
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {worldTab === "terms" && <TermManager />}
        {worldTab === "synopsis" && <SynopsisEditor />}
        {worldTab === "mindmap" && <MindMapBoard />}
        {worldTab === "drawing" && <DrawingCanvas />}
        {worldTab === "plot" && <PlotBoard />}
      </div>
    </div>
  );
}

const TermCard = ({
  item,
  isOverlay = false,
  onSelect,
  onDelete,
  t,
}: {
  item: Term;
  isOverlay?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
  t: TFunction;
}) => {
  return (
    <div
      className={cn(
        "group flex flex-col justify-between p-4 bg-element border border-border rounded-xl relative shadow-sm transition-all overflow-hidden h-full",
        isOverlay ? "cursor-grabbing shadow-xl border-accent scale-105 z-50 bg-element-hover" : "hover:bg-element-hover hover:border-accent/40 hover:-translate-y-1 hover:shadow-md cursor-grab"
      )}
      onClick={onSelect ? () => onSelect(item.id) : undefined}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <span className="font-bold text-base text-fg leading-tight line-clamp-2 pr-6">
            {item.term}
          </span>
        </div>

        {item.category && (
          <span className="inline-flex self-start items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-active/10 text-active">
            {item.category}
          </span>
        )}

        <div className="text-xs text-muted-foreground line-clamp-3 leading-relaxed opacity-80">
          {item.definition || t("world.term.noDefinition")}
        </div>
      </div>

      {onDelete && !isOverlay && (
        <button
          className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted transition-all cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          title={t("common.delete")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

const SortableTermItem = ({
  item,
  onSelect,
  onDelete,
  t,
}: {
  item: Term;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  t: TFunction;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: dndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="h-full">
      <TermCard item={item} onSelect={onSelect} onDelete={onDelete} t={t} />
    </div>
  );
};



// ... (imports remain same, just ensure DragStartEvent is there)

// ... imports

function TermManager() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const { terms, currentTerm, setCurrentTerm, loadTerms, createTerm, updateTerm, deleteTerm } = useTermStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Local state for DnD to prevent optimistic UI glitch
  const [temporaryOrder, setTemporaryOrder] = useState<Term[] | null>(null);

  // Memoize the sorted list from props
  const sortedTermsFromStore = useMemo(() => {
    return [...terms].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [terms]);

  // Use temporary order during drag/operations, otherwise store order
  const orderedTerms = temporaryOrder ?? sortedTermsFromStore;

  useEffect(() => {
    if (currentProject) {
      loadTerms(currentProject.id);
    }
  }, [currentProject, loadTerms]);

  const handleAddTerm = useCallback(async () => {
    if (currentProject) {
      const maxOrder = Math.max(...terms.map(t => t.order || 0), 0);
      await createTerm({
        projectId: currentProject.id,
        term: t("world.term.defaultName"),
        definition: "",
        category: t("world.term.defaultCategory"),
        order: maxOrder + 1,
      });
    }
  }, [currentProject, createTerm, t, terms]);

  useShortcutCommand((command) => {
    if (command.type === "world.addTerm") {
      void handleAddTerm();
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setTemporaryOrder(sortedTermsFromStore);
  }, [sortedTermsFromStore]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
        // Calculate new order based on current dragged state (which matches UI)
        // We use function update to ensure we have latest temporaryOrder if needed,
        // but here we just need to calculate the new list one last time to update backend.
        // Since we are inside callback, we should use the state updater if we were setting state,
        // but here we want to compute the final array to send updates.
        
        // We can't access temporaryOrder state directly if it's stale in closure?
        // But active.id and over.id are enough to reorder `orderedTerms`.
        // We need to know which list we are operating on.
        // Since drag started, `temporaryOrder` should be set.
        
        setTemporaryOrder((currentItems) => {
            const items = currentItems || sortedTermsFromStore;
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            
            if (oldIndex === -1 || newIndex === -1) return null; // Reset to store

            const newItems = arrayMove(items, oldIndex, newIndex);
            
            // Optimistic update to backend
            // We update each item that changed index
            newItems.forEach((item, index) => {
                if (item.order !== index) {
                    updateTerm({ id: item.id, order: index });
                }
            });

            // We return null to switch back to store source, 
            // assuming store updates will come in efficiently.
            // If we want to avoid flicker, we might need a better optimistic store update strategy,
            // but for now this is cleaner than sync effects.
            return null; 
        });
    } else {
        setTemporaryOrder(null);
    }
  }, [sortedTermsFromStore, updateTerm]);

  const activeItem = useMemo(() => 
    orderedTerms.find(item => item.id === activeId), 
  [orderedTerms, activeId]);

  if (currentTerm) {
    return (
      <div className="p-4 h-full overflow-y-auto">
        <div className="flex items-center gap-3 pb-3 mb-4 border-b border-border sticky top-0 bg-app z-10 pt-2">
          <div
            className="flex items-center justify-center p-1 rounded hover:bg-hover text-muted hover:text-fg transition-colors cursor-pointer"
            onClick={() => setCurrentTerm(null)}
          >
            <ArrowLeft className="icon-md" />
          </div>
          <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{currentTerm.term}</span>
        </div>

        <div className="grid grid-cols-[100px_1fr] gap-4 items-start pb-8">
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.label")}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={currentTerm.term}
              onSave={(val) => updateTerm({ id: currentTerm.id, term: val })}
            />
          </div>
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.definitionLabel")}</div>
          <div className="min-w-0">
            <BufferedTextArea
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all font-sans leading-relaxed"
              value={currentTerm.definition || ""}
              onSave={(val) => updateTerm({ id: currentTerm.id, definition: val })}
              style={{ minHeight: "100px" }}
            />
          </div>
          <div className="text-right text-xs font-bold text-muted pt-2 uppercase tracking-wide">{t("world.term.categoryLabel")}</div>
          <div className="min-w-0">
            <BufferedInput
              className="w-full p-2 bg-element border border-border rounded text-sm text-fg outline-none focus:border-active focus:ring-1 focus:ring-active transition-all"
              value={currentTerm.category || ""}
              onSave={(val) => updateTerm({ id: currentTerm.id, category: val })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCenter} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
            items={orderedTerms.map(t => t.id)} 
            strategy={rectSortingStrategy}
        >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 pb-10">
                <div
                    className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl cursor-pointer text-muted hover:text-accent hover:border-accent hover:bg-accent/5 transition-all text-sm font-medium group"
                    onClick={handleAddTerm}
                    style={{ minHeight: "120px", height: "100%" }}
                >
                    <div className="p-2 rounded-full bg-secondary/50 group-hover:bg-accent/10 transition-colors">
                    <Plus className="icon-lg group-hover:scale-110 transition-transform" />
                    </div>
                    <span>{t("world.term.addLabel")}</span>
                </div>
                
                {orderedTerms.map((term) => (
                    <SortableTermItem 
                        key={term.id} 
                        item={term} 
                        onSelect={(id) => {
                            const term = terms.find(t => t.id === id);
                            setCurrentTerm(term || null);
                        }}
                        onDelete={deleteTerm}
                        t={t}
                    />
                ))}
            </div>
        </SortableContext>
        {/* Drag Overlay for better UX */}
        <DragOverlay>
            {activeItem ? (
                <TermCard item={activeItem} isOverlay t={t} />
            ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SynopsisEditor() {
  const { t } = useTranslation();
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
        <span>{t("world.synopsis.title")}</span>
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
              {t(`world.synopsis.status.${s}`)}
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
        placeholder={t("world.synopsis.placeholder")}
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
        {t("world.synopsis.hint")}
      </div>
    </div>
  );
}

function MindMapBoard() {
  const { t } = useTranslation();
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
  const { t } = useTranslation();
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
      const text = window.prompt(t("world.drawing.placePrompt"));
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
            title={t("world.drawing.toolPen")}
          >
            <PenTool className="icon-md" />
          </button>
          <button
            className={cn("w-7 h-7 flex items-center justify-center rounded text-muted hover:bg-hover hover:text-fg transition-colors", tool === "text" && "bg-active text-accent")}
            onClick={() => setTool("text")}
            title={t("world.drawing.toolText")}
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
          <Eraser className="icon-sm" /> {t("world.drawing.clear")}
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
  const { t } = useTranslation();
  const [columns, setColumns] = useState(() => [
    {
      id: "act1",
      title: t("world.plot.act1Title"),
      cards: [
        { id: "c1", content: t("world.plot.card.act1_1") },
        { id: "c2", content: t("world.plot.card.act1_2") },
      ],
    },
    {
      id: "act2",
      title: t("world.plot.act2Title"),
      cards: [{ id: "c3", content: t("world.plot.card.act2_1") }],
    },
    {
      id: "act3",
      title: t("world.plot.act3Title"),
      cards: [{ id: "c4", content: t("world.plot.card.act3_1") }],
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
              { id: Date.now().toString(), content: t("world.plot.newBeat") },
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
        <div key={col.id} className="w-70 shrink-0 flex flex-col bg-sidebar border border-border rounded-lg max-h-full">
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
            <Plus className="icon-sm" /> {t("world.plot.addBeat")}
          </button>
        </div>
      ))}
    </div>
  );
}
