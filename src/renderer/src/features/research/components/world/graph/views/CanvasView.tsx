import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import ReactFlow, {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  SelectionMode,
  type Connection,
  type EdgeChange,
  type Edge,
  type NodeChange,
  type Node,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "@shared/api";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasMemoBlockData,
  WorldGraphCanvasTimelineBlockData,
  WorldGraphNode,
} from "@shared/types";
import { Card, CardContent } from "@renderer/components/ui/card";
import { CanvasTimelinePalette } from "../components/CanvasTimelinePalette";
import { CanvasToolbar } from "../components/CanvasToolbar";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import type {
  CanvasTimelineBlockData,
  TimelineSequenceNode,
} from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import {
  CANVAS_EDGE_TYPES,
  CANVAS_NODE_TYPES,
} from "../components/canvasFlowTypes";

type AnyCanvasNodeData =
  | CanvasGraphNodeData
  | CanvasTimelineBlockData
  | CanvasMemoBlockData;

const SMART_GUIDE_SNAP_PX = 10;
const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 120;

const isCanvasLocalNodeType = (
  nodeType: string | undefined,
): nodeType is "canvas-timeline" | "canvas-memo" =>
  nodeType === "canvas-timeline" || nodeType === "canvas-memo";

const toCanvasBlockNodes = (
  blocks: WorldGraphCanvasBlock[],
  input: {
    onDelete: (id: string) => void;
    onMemoChange: (
      id: string,
      patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
    ) => void;
    onTimelineChange: (
      id: string,
      nextSequence: TimelineSequenceNode[],
    ) => void;
  },
): Node<AnyCanvasNodeData>[] =>
  blocks.map((block) => {
    if (block.type === "memo") {
      return {
        id: block.id,
        type: "canvas-memo",
        position: {
          x: block.positionX,
          y: block.positionY,
        },
        draggable: true,
        data: {
          title: block.data.title,
          tags: [...block.data.tags],
          body: block.data.body,
          onDelete: input.onDelete,
          onDataChange: input.onMemoChange,
        } satisfies CanvasMemoBlockData,
      };
    }

    return {
      id: block.id,
      type: "canvas-timeline",
      position: {
        x: block.positionX,
        y: block.positionY,
      },
      draggable: true,
      data: {
        label: block.data.label,
        sequence: block.data.sequence,
        onDelete: input.onDelete,
        onUpdateSequence: input.onTimelineChange,
      } satisfies CanvasTimelineBlockData,
    };
  });

const fromCanvasLocalNodes = (
  nodes: Node<AnyCanvasNodeData>[],
): WorldGraphCanvasBlock[] => {
  const blocks: WorldGraphCanvasBlock[] = [];

  for (const node of nodes) {
    if (node.type === "canvas-memo") {
      const data = node.data as CanvasMemoBlockData;
      const payload: WorldGraphCanvasMemoBlockData = {
        title: typeof data.title === "string" ? data.title : "",
        tags: Array.isArray(data.tags)
          ? data.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        body: typeof data.body === "string" ? data.body : "",
      };
      blocks.push({
        id: node.id,
        type: "memo",
        positionX: node.position.x,
        positionY: node.position.y,
        data: payload,
      });
      continue;
    }

    if (node.type === "canvas-timeline") {
      const data = node.data as CanvasTimelineBlockData;
      const payload: WorldGraphCanvasTimelineBlockData = {
        label: typeof data.label === "string" ? data.label : "",
        sequence: Array.isArray(data.sequence) ? data.sequence : [],
      };
      blocks.push({
        id: node.id,
        type: "timeline",
        positionX: node.position.x,
        positionY: node.position.y,
        data: payload,
      });
    }
  }

  return blocks;
};

const syncCanvasLocalNodes = (
  currentNodes: Node<AnyCanvasNodeData>[],
  incomingCanvasNodes: Node<AnyCanvasNodeData>[],
  lockedNodeId: string | null,
): Node<AnyCanvasNodeData>[] => {
  const nonLocal = currentNodes.filter(
    (node) => !isCanvasLocalNodeType(node.type),
  );
  const nextLocal = incomingCanvasNodes.map((incoming) => {
    const current = currentNodes.find((node) => node.id === incoming.id);
    if (!current || incoming.id !== lockedNodeId) {
      return incoming;
    }

    return {
      ...incoming,
      position: current.position,
      selected: current.selected,
    };
  });

  return [...nonLocal, ...nextLocal];
};

interface CanvasViewProps {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  canvasBlocks: WorldGraphCanvasBlock[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateRelation?: (input: {
    sourceId: string;
    targetId: string;
  }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: () => void;
  onAddTimelineBranch?: (sourceNodeId: string) => void;
  onCreateNote: () => void;
}

function readPosition(node: WorldGraphNode, index: number) {
  const fallbackColumn = index % 4;
  const fallbackRow = Math.floor(index / 4);

  return {
    x:
      Number.isFinite(node.positionX) && node.positionX !== 0
        ? node.positionX
        : 120 + fallbackColumn * 280,
    y:
      Number.isFinite(node.positionY) && node.positionY !== 0
        ? node.positionY
        : 120 + fallbackRow * 220,
  };
}

function decorateEdges(
  edges: Edge<CanvasGraphEdgeData>[],
  selectedEdgeId: string | null,
): Edge<CanvasGraphEdgeData>[] {
  return edges.map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
  }));
}

const buildFlowNodes = (
  nodes: WorldGraphNode[],
  onDeleteNode?: (nodeId: string) => void,
  onAddTimelineBranch?: (sourceNodeId: string) => void,
): Node<CanvasGraphNodeData>[] => {
  return nodes.map((node, index) => ({
    id: node.id,
    type: node.entityType === "Event" ? "canvas-timeline" : "custom-entity",
    draggable: true,
    position: readPosition(node, index),
    data: {
      label: node.name,
      entityType: node.entityType,
      description: node.description?.trim() || "",
      date: (node.attributes as any)?.date || (node.attributes as any)?.time,
      onDelete: onDeleteNode,
      onAddBranch: onAddTimelineBranch,
    },
  }));
};

const buildFlowEdges = (
  edges: EntityRelation[],
  onDeleteRelation?: (id: string) => void,
): Edge<CanvasGraphEdgeData>[] => {
  const palette = {
    stroke: "rgba(255,255,255,0.12)",
    selectedStroke: "#f59e0b",
    glow: "rgba(245,158,11,0.1)",
  };

  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.relation.replaceAll("_", " "),
    type: "canvas-edge",
    data: {
      palette,
      onDelete: onDeleteRelation,
    },
    interactionWidth: 20,
  }));
};

function mergeIncomingNodes(
  currentNodes: Node<AnyCanvasNodeData>[],
  incomingNodes: Node<CanvasGraphNodeData>[],
  lockedNodeId: string | null,
): Node<AnyCanvasNodeData>[] {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const incomingIds = new Set(incomingNodes.map((n) => n.id));

  const localNodes = currentNodes.filter(
    (n) => n.type === "canvas-timeline" || n.type === "canvas-memo",
  );

  const merged = incomingNodes.map((incomingNode) => {
    const currentNode = currentById.get(incomingNode.id);
    if (!currentNode || incomingNode.id === lockedNodeId) {
      return incomingNode as Node<AnyCanvasNodeData>;
    }
    return {
      ...incomingNode,
      position: currentNode.position,
      selected: currentNode.selected,
    } as Node<AnyCanvasNodeData>;
  });

  const preservedLocals = localNodes.filter((n) => !incomingIds.has(n.id));
  return [...merged, ...preservedLocals];
}

let localNodeCounter = 0;
function generateLocalId(prefix: string) {
  localNodeCounter += 1;
  return `${prefix}-${Date.now()}-${localNodeCounter}`;
}

type AxisGuide = {
  guide: number;
  snapped: number;
};

const getNodeDimensions = (node: Node<AnyCanvasNodeData>) => ({
  width: node.width ?? DEFAULT_NODE_WIDTH,
  height: node.height ?? DEFAULT_NODE_HEIGHT,
});

const getAxisCandidates = (node: Node<AnyCanvasNodeData>) => {
  const { width, height } = getNodeDimensions(node);
  return {
    x: [
      { value: node.position.x, offset: 0 },
      { value: node.position.x + width / 2, offset: width / 2 },
      { value: node.position.x + width, offset: width },
    ],
    y: [
      { value: node.position.y, offset: 0 },
      { value: node.position.y + height / 2, offset: height / 2 },
      { value: node.position.y + height, offset: height },
    ],
  };
};

const findBestAxisGuide = (
  dragged: Node<AnyCanvasNodeData>,
  others: Node<AnyCanvasNodeData>[],
  axis: "x" | "y",
): AxisGuide | null => {
  const draggedCandidates = getAxisCandidates(dragged)[axis];
  let bestDelta = Number.POSITIVE_INFINITY;
  let bestGuide: AxisGuide | null = null;

  for (const other of others) {
    const otherCandidates = getAxisCandidates(other)[axis];

    for (const draggedCandidate of draggedCandidates) {
      for (const otherCandidate of otherCandidates) {
        const delta = Math.abs(otherCandidate.value - draggedCandidate.value);
        if (delta > SMART_GUIDE_SNAP_PX || delta >= bestDelta) {
          continue;
        }

        bestDelta = delta;
        bestGuide = {
          guide: otherCandidate.value,
          snapped: otherCandidate.value - draggedCandidate.offset,
        };
      }
    }
  }

  return bestGuide;
};

function CanvasFlowSurface({
  graphNodes,
  graphEdges,
  canvasBlocks,
  timelineNodes,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCanvasBlocksCommit,
  onNodePositionCommit,
  onDeleteNode,
  onCreateRelation,
  onDeleteRelation,
  onCreateBlock,
}: {
  graphNodes: Node<CanvasGraphNodeData>[];
  graphEdges: Edge<CanvasGraphEdgeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateRelation?: (input: {
    sourceId: string;
    targetId: string;
  }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: () => void;
}) {
  const [nodes, setNodes] = useState<Node<AnyCanvasNodeData>[]>(graphNodes);
  const [edges, setEdges] = useState<Edge<CanvasGraphEdgeData>[]>(graphEdges);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [timelinePaletteOpen, setTimelinePaletteOpen] = useState(false);
  const [guideLines, setGuideLines] = useState<{
    x: number | null;
    y: number | null;
  }>({
    x: null,
    y: null,
  });
  const draggingNodeIdRef = useRef<string | null>(null);
  const lastGuideSignatureRef = useRef<string | null>(null);
  const nodesRef = useRef<Node<AnyCanvasNodeData>[]>(graphNodes);
  const reactFlow = useReactFlow<AnyCanvasNodeData>();
  const historyRef = useRef<Node<AnyCanvasNodeData>[][]>([]);
  const historyIndexRef = useRef(-1);

  const commitCanvasBlocks = useCallback(
    (snapshot: Node<AnyCanvasNodeData>[]) => {
      onCanvasBlocksCommit?.(fromCanvasLocalNodes(snapshot));
    },
    [onCanvasBlocksCommit],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    setNodes((currentNodes) =>
      mergeIncomingNodes(currentNodes, graphNodes, draggingNodeIdRef.current),
    );
  }, [graphNodes]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const incomingCanvasNodes = toCanvasBlockNodes(canvasBlocks, {
        onDelete: (id) => {
          setNodes((innerCurrent) => {
            const next = innerCurrent.filter((node) => node.id !== id);
            commitCanvasBlocks(next);
            return next;
          });
        },
        onMemoChange: (id, patch) => {
          setNodes((innerCurrent) => {
            const next = innerCurrent.map((node) => {
              if (node.id !== id || node.type !== "canvas-memo") {
                return node;
              }

              return {
                ...node,
                data: {
                  ...(node.data as CanvasMemoBlockData),
                  ...patch,
                },
              };
            });
            commitCanvasBlocks(next);
            return next;
          });
        },
        onTimelineChange: (id, nextSequence) => {
          setNodes((innerCurrent) => {
            const next = innerCurrent.map((node) => {
              if (node.id !== id || node.type !== "canvas-timeline") {
                return node;
              }
              return {
                ...node,
                data: {
                  ...node.data,
                  sequence: nextSequence,
                },
              };
            });
            commitCanvasBlocks(next);
            return next;
          });
        },
      });

      return syncCanvasLocalNodes(
        currentNodes,
        incomingCanvasNodes,
        draggingNodeIdRef.current,
      );
    });
  }, [canvasBlocks, commitCanvasBlocks]);

  useEffect(() => {
    setEdges(decorateEdges(graphEdges, selectedEdgeId));
  }, [graphEdges, selectedEdgeId]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const activeNodeId =
        currentNodes.find((node) => node.selected)?.id ?? null;
      if (activeNodeId === selectedNodeId) return currentNodes;
      return currentNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }));
    });
  }, [selectedNodeId]);

  useEffect(() => {
    if (selectedNodeId) setSelectedEdgeId(null);
  }, [selectedNodeId]);

  useEffect(() => {
    if (autoLayoutTrigger === 0) return;
    const COLS = 4;
    const COL_GAP = 280;
    const ROW_GAP = 220;
    const OFFSET_X = 120;
    const OFFSET_Y = 120;
    setNodes((currentNodes) =>
      currentNodes.map((node, i) => ({
        ...node,
        position: {
          x: OFFSET_X + (i % COLS) * COL_GAP,
          y: OFFSET_Y + Math.floor(i / COLS) * ROW_GAP,
        },
      })),
    );
    setTimeout(() => {
      void reactFlow.fitView({ padding: 0.24, duration: 300 });
    }, 50);
  }, [autoLayoutTrigger, reactFlow]);

  const getViewportCenter = useCallback(() => {
    const { x, y, zoom } = reactFlow.getViewport();
    const el = document.querySelector(".react-flow");
    const width = el?.clientWidth ?? 800;
    const height = el?.clientHeight ?? 600;
    return {
      x: (-x + width / 2) / zoom - 140,
      y: (-y + height / 2) / zoom - 60,
    };
  }, [reactFlow]);

  const pushHistory = useCallback((snapshot: Node<AnyCanvasNodeData>[]) => {
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    historyRef.current.push(snapshot);
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current += 1;
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (snapshot) setNodes(snapshot);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    if (snapshot) setNodes(snapshot);
  }, []);

  const handleDeleteLocalNode = useCallback(
    (id: string) => {
      setNodes((current) => {
        const next = current.filter((n) => n.id !== id);
        commitCanvasBlocks(next);
        return next;
      });
    },
    [commitCanvasBlocks],
  );

  const handleMemoDataChange = useCallback(
    (
      id: string,
      patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
    ) => {
      setNodes((current) => {
        const next = current.map((n) => {
          if (n.id !== id || n.type !== "canvas-memo") return n;
          return {
            ...n,
            data: { ...(n.data as CanvasMemoBlockData), ...patch },
          };
        });
        commitCanvasBlocks(next);
        return next;
      });
    },
    [commitCanvasBlocks],
  );

  const handleCreateMemo = useCallback(() => {
    const position = getViewportCenter();
    const id = generateLocalId("memo");
    const newNode: Node<CanvasMemoBlockData> = {
      id,
      type: "canvas-memo",
      position,
      draggable: true,
      data: {
        title: "",
        tags: [],
        body: "",
        onDelete: handleDeleteLocalNode,
        onDataChange: handleMemoDataChange,
      },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      pushHistory(next);
      commitCanvasBlocks(next);
      return next;
    });
  }, [
    commitCanvasBlocks,
    getViewportCenter,
    handleDeleteLocalNode,
    handleMemoDataChange,
    pushHistory,
  ]);

  const handleUpdateTimelineSequence = useCallback(
    (nodeId: string, nextSequence: TimelineSequenceNode[]) => {
      setNodes((current) => {
        const next = current.map((node) => {
          if (node.id !== nodeId || node.type !== "canvas-timeline") {
            return node;
          }
          return { ...node, data: { ...node.data, sequence: nextSequence } };
        });
        commitCanvasBlocks(next);
        return next;
      });
    },
    [commitCanvasBlocks],
  );

  const handlePickTimelineEvent = useCallback(
    (nodeId: string) => {
      const source = timelineNodes.find((n) => n.id === nodeId);
      if (!source) return;
      const position = getViewportCenter();
      const id = generateLocalId("timeline");

      const newNode: Node<CanvasTimelineBlockData> = {
        id,
        type: "canvas-timeline",
        position,
        draggable: true,
        data: {
          label: source.name,
          sequence: [
            {
              id: `seq-${Date.now()}`,
              content: source.name,
              isHeld: false,
              topBranches: [],
              bottomBranches: [],
            },
          ],
          onDelete: handleDeleteLocalNode,
          onUpdateSequence: handleUpdateTimelineSequence,
        },
      };
      setNodes((current) => {
        const next = [...current, newNode];
        commitCanvasBlocks(next);
        return next;
      });
      onSelectNode(null);
    },
    [
      timelineNodes,
      getViewportCenter,
      handleDeleteLocalNode,
      handleUpdateTimelineSequence,
      onSelectNode,
    ],
  );

  const handleCreateTimelineBlock = useCallback(() => {
    const position = getViewportCenter();
    const id = generateLocalId("timeline");
    const newNode: Node<CanvasTimelineBlockData> = {
      id,
      type: "canvas-timeline",
      position,
      draggable: true,
      data: {
        label: "",
        sequence: [
          {
            id: `seq-${Date.now()}`,
            content: "여정의 시작",
            isHeld: false,
            topBranches: [],
            bottomBranches: [],
          },
        ],
        onDelete: handleDeleteLocalNode,
        onUpdateSequence: handleUpdateTimelineSequence,
      },
    };
    setNodes((current) => {
      const next = [...current, newNode];
      pushHistory(next);
      commitCanvasBlocks(next);
      return next;
    });
  }, [
    commitCanvasBlocks,
    getViewportCenter,
    handleDeleteLocalNode,
    handleUpdateTimelineSequence,
    pushHistory,
  ]);

  const handleNodesChange = (changes: NodeChange[]) =>
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdges((currentEdges) =>
      decorateEdges(applyEdgeChanges(changes, currentEdges), selectedEdgeId),
    );
    const selectedChange = [...changes]
      .reverse()
      .find((change) => change.type === "select");
    if (selectedChange?.type === "select") {
      setSelectedEdgeId(selectedChange.selected ? selectedChange.id : null);
    }
  };

  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || !onCreateRelation) return;
    void onCreateRelation({
      sourceId: connection.source,
      targetId: connection.target,
    });
  };

  const viewport = reactFlow.getViewport();
  const guideScreenX =
    guideLines.x === null ? null : guideLines.x * viewport.zoom + viewport.x;
  const guideScreenY =
    guideLines.y === null ? null : guideLines.y * viewport.zoom + viewport.y;

  return (
    <div className="absolute inset-0">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={CANVAS_NODE_TYPES}
        edgeTypes={CANVAS_EDGE_TYPES}
        minZoom={0.4}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        proOptions={{ hideAttribution: true }}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => {
          onSelectNode(node.id);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          onSelectNode(null);
        }}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          onSelectNode(null);
        }}
        onNodesDelete={(deletedNodes) => {
          deletedNodes.forEach((node) => {
            if (node.type === "custom-entity") onDeleteNode?.(node.id);
          });
          setSelectedEdgeId(null);
        }}
        onEdgesDelete={(deletedEdges) => {
          deletedEdges.forEach((edge) => void onDeleteRelation?.(edge.id));
        }}
        onNodeDragStart={(_, node) => {
          draggingNodeIdRef.current = node.id;
        }}
        onNodeDrag={(_, node) => {
          const allNodes = nodesRef.current;
          const dragged = allNodes.find((item) => item.id === node.id);
          if (!dragged) {
            return;
          }
          const draggingNode: Node<AnyCanvasNodeData> = {
            ...dragged,
            position: {
              x: node.position.x,
              y: node.position.y,
            },
          };
          const otherNodes = allNodes.filter((item) => item.id !== node.id);

          const guideXMatch = findBestAxisGuide(draggingNode, otherNodes, "x");
          const guideYMatch = findBestAxisGuide(draggingNode, otherNodes, "y");

          const snapX = guideXMatch?.snapped ?? node.position.x;
          const snapY = guideYMatch?.snapped ?? node.position.y;
          const guideX = guideXMatch?.guide ?? null;
          const guideY = guideYMatch?.guide ?? null;

          const signature =
            guideX !== null || guideY !== null
              ? `${guideX ?? "none"}:${guideY ?? "none"}`
              : null;
          if (signature && signature !== lastGuideSignatureRef.current) {
            lastGuideSignatureRef.current = signature;
            void api.window.hapticFeedback();
          } else if (!signature) {
            lastGuideSignatureRef.current = null;
          }

          setGuideLines((current) => {
            if (current.x === guideX && current.y === guideY) {
              return current;
            }
            return { x: guideX, y: guideY };
          });

          if (snapX !== node.position.x || snapY !== node.position.y) {
            setNodes((currentNodes) =>
              currentNodes.map((currentNode) => {
                if (currentNode.id !== node.id) {
                  return currentNode;
                }
                return {
                  ...currentNode,
                  position: {
                    x: snapX,
                    y: snapY,
                  },
                };
              }),
            );
          }
        }}
        onNodeDragStop={(_, node) => {
          draggingNodeIdRef.current = null;
          setGuideLines({ x: null, y: null });
          lastGuideSignatureRef.current = null;

          const currentNode = nodesRef.current.find(
            (item) => item.id === node.id,
          );
          const position = currentNode?.position ?? node.position;

          if (node.type === "custom-entity") {
            onNodePositionCommit?.({
              id: node.id,
              x: position.x,
              y: position.y,
            });
          }

          if (isCanvasLocalNodeType(node.type)) {
            commitCanvasBlocks(nodesRef.current);
          }
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        panOnDrag={[2]}
        panOnScroll
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        className="bg-[#0f1319]"
      >
        <Background
          color="rgba(255,255,255,0.04)"
          gap={32}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {guideScreenX !== null ? (
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-amber-400/70"
          style={{ left: `${guideScreenX}px` }}
        />
      ) : null}
      {guideScreenY !== null ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 h-px bg-amber-400/70"
          style={{ top: `${guideScreenY}px` }}
        />
      ) : null}

      {/* Control Bar - High Quality Minimalist */}
      <div className="absolute right-6 top-6 z-10 flex flex-col gap-3">
        <div className="flex flex-col overflow-hidden border border-white/10 rounded-xl bg-background/80 shadow-2xl backdrop-blur-xl">
          {[
            {
              icon: Plus,
              title: "Zoom In",
              onClick: () => void reactFlow.zoomIn(),
            },
            {
              icon: Minus,
              title: "Zoom Out",
              onClick: () => void reactFlow.zoomOut(),
            },
            {
              icon: RefreshCw,
              title: "Fit View",
              onClick: () => void reactFlow.fitView({ padding: 0.2 }),
            },
            {
              icon: Maximize2,
              title: "Full Screen",
              onClick: () => void reactFlow.fitView({ padding: 0.05 }),
            },
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center justify-center w-10 h-10 transition-colors border-b last:border-0 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5"
              title={ctrl.title}
              onClick={ctrl.onClick}
            >
              <ctrl.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex flex-col overflow-hidden border border-white/10 rounded-xl bg-background/80 shadow-2xl backdrop-blur-xl">
          {[
            { icon: RotateCcw, title: "Undo", onClick: handleUndo },
            { icon: RotateCw, title: "Redo", onClick: handleRedo },
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              className="flex items-center justify-center w-10 h-10 transition-colors border-b last:border-0 border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5"
              title={ctrl.title}
              onClick={ctrl.onClick}
            >
              <ctrl.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      <CanvasToolbar
        onCreateBlock={onCreateBlock}
        onOpenTimelinePalette={() => setTimelinePaletteOpen(true)}
        onCreateNote={handleCreateMemo}
      />

      <CanvasTimelinePalette
        open={timelinePaletteOpen}
        events={timelineNodes}
        onClose={() => setTimelinePaletteOpen(false)}
        onCreateEvent={() => {
          handleCreateTimelineBlock();
          setTimelinePaletteOpen(false);
        }}
        onPickEvent={(nodeId) => {
          handlePickTimelineEvent(nodeId);
          setTimelinePaletteOpen(false);
        }}
      />
    </div>
  );
}

export function CanvasView({
  nodes,
  edges,
  canvasBlocks,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCanvasBlocksCommit,
  onNodePositionCommit,
  onDeleteNode,
  onCreateRelation,
  onDeleteRelation,
  onCreateBlock,
  onAddTimelineBranch,
  onCreateNote: _onCreateNote,
}: CanvasViewProps) {
  const flowNodes = useMemo(
    () => buildFlowNodes(nodes, onDeleteNode, onAddTimelineBranch),
    [nodes, onDeleteNode, onAddTimelineBranch],
  );
  const flowEdges = useMemo(
    () => buildFlowEdges(edges, (id) => void onDeleteRelation?.(id)),
    [edges, onDeleteRelation],
  );
  const timelineNodes = useMemo(
    () => nodes.filter((node) => node.entityType === "Event"),
    [nodes],
  );

  return (
    <div className="relative h-full bg-[#0f1319]">
      <ReactFlowProvider>
        <CanvasFlowSurface
          graphNodes={flowNodes}
          graphEdges={flowEdges}
          canvasBlocks={canvasBlocks}
          timelineNodes={timelineNodes}
          selectedNodeId={selectedNodeId}
          autoLayoutTrigger={autoLayoutTrigger}
          onSelectNode={onSelectNode}
          onCanvasBlocksCommit={onCanvasBlocksCommit}
          onNodePositionCommit={onNodePositionCommit}
          onDeleteNode={onDeleteNode}
          onCreateRelation={onCreateRelation}
          onDeleteRelation={onDeleteRelation}
          onCreateBlock={onCreateBlock}
        />
      </ReactFlowProvider>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
          <Card className="max-w-md text-center border-dashed border-white/10 bg-background/60 backdrop-blur-xl shadow-2xl">
            <CardContent className="pt-6 space-y-4">
              <p className="text-xl font-black tracking-tight text-foreground/80">
                Canvas is Ready
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Add your first entity to start building your world.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
