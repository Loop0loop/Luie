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
  MarkerType,
  ReactFlowProvider,
  SelectionMode,
  type Connection,
  type ConnectionMode,
  type EdgeChange,
  type Edge,
  type NodeChange,
  type Node,
  type XYPosition,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { api } from "@shared/api";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphCanvasEdgeDirection,
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
const CANVAS_EDGE_COLORS = [
  "#f59e0b",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#34d399",
  "#f97316",
] as const;

const readNodeDate = (
  attributes: WorldGraphNode["attributes"],
): string | undefined => {
  if (
    !attributes ||
    typeof attributes !== "object" ||
    Array.isArray(attributes)
  ) {
    return undefined;
  }

  const record = attributes as Record<string, unknown>;
  const date = record.date;
  if (typeof date === "string" && date.trim().length > 0) {
    return date;
  }

  const time = record.time;
  return typeof time === "string" && time.trim().length > 0 ? time : undefined;
};

const isTimelineInternalHandle = (handleId?: string | null): boolean => {
  if (!handleId) {
    return false;
  }
  return /-(?:t|b)-(?:in|out)$/.test(handleId);
};

const isTimelineRootHandle = (handleId?: string | null): boolean => {
  if (!handleId) {
    return true;
  }
  return /^root-(?:top|bottom|left|right)-(?:source|target)$/.test(handleId);
};

const isCanvasLocalNodeType = (
  nodeType: string | undefined,
): nodeType is "canvas-timeline" | "canvas-memo" =>
  nodeType === "canvas-timeline" || nodeType === "canvas-memo";

const toCanvasBlockNodes = (
  blocks: WorldGraphCanvasBlock[],
  input: {
    onDelete: (id: string) => void;
    onBlockColorChange: (id: string) => void;
    onMemoChange: (
      id: string,
      patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
    ) => void;
    onTimelineChange: (
      id: string,
      nextSequence: TimelineSequenceNode[],
    ) => void;
    onTimelineMetaChange: (
      id: string,
      patch: Partial<
        Omit<
          CanvasTimelineBlockData,
          "onChangeColor" | "onUpdateSequence" | "onDelete" | "onDataChange"
        >
      >,
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
          color: block.data.color,
          onDelete: input.onDelete,
          onChangeColor: input.onBlockColorChange,
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
        color: block.data.color,
        onDataChange: (id, patch) => {
          if (Array.isArray(patch.sequence)) {
            input.onTimelineChange(id, patch.sequence);
          }

          const timelineMetaPatch: Partial<
            Omit<
              CanvasTimelineBlockData,
              "onChangeColor" | "onUpdateSequence" | "onDelete" | "onDataChange"
            >
          > = {};
          if (typeof patch.label === "string") {
            timelineMetaPatch.label = patch.label;
          }

          if (Object.keys(timelineMetaPatch).length > 0) {
            input.onTimelineMetaChange(id, timelineMetaPatch);
          }
        },
        onChangeColor: input.onBlockColorChange,
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
        color: typeof data.color === "string" ? data.color : undefined,
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
        color: typeof data.color === "string" ? data.color : undefined,
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
  canvasEdges: WorldGraphCanvasEdge[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onCanvasEdgesCommit?: (edges: WorldGraphCanvasEdge[]) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onCreateCanvasRelation?: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => Promise<void>;
  onDeleteRelation?: (relationId: string) => Promise<void>;
  onCreateBlock: (position?: { x: number; y: number }) => void;
  onAddTimelineBranch?: (sourceNodeId: string) => void;
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
  onNodeColorChange?: (nodeId: string) => void,
  onNodeEdit?: (nodeId: string) => void,
  onAddTimelineBranch?: (sourceNodeId: string) => void,
): Node<CanvasGraphNodeData>[] => {
  return nodes.map((node, index) => ({
    id: node.id,
    type: "custom-entity",
    draggable: true,
    position: readPosition(node, index),
    data: {
      label: node.name,
      entityType: node.entityType,
      color:
        node.attributes && typeof node.attributes === "object"
          ? ((node.attributes as Record<string, unknown>).canvasColor as
              | string
              | undefined)
          : undefined,
      description: node.description?.trim() || "",
      date: readNodeDate(node.attributes),
      onDelete: onDeleteNode,
      onChangeColor: onNodeColorChange,
      onEdit: onNodeEdit,
      onAddBranch: onAddTimelineBranch,
    },
  }));
};

const buildFlowEdges = (
  edges: EntityRelation[],
  canvasEdges: WorldGraphCanvasEdge[],
  handlers: {
    onDeleteRelation?: (id: string) => void;
    onDeleteCanvasEdge?: (id: string) => void;
    onChangeCanvasEdgeColor?: (id: string) => void;
    onChangeCanvasEdgeDirection?: (id: string) => void;
    onEditCanvasEdgeRelation?: (id: string) => void;
    onUpdateCanvasEdge?: (id: string) => void;
    onZoomEdge?: (id: string) => void;
  },
): Edge<CanvasGraphEdgeData>[] => {
  const entityPalette = {
    stroke: "rgba(255,255,255,0.12)",
    selectedStroke: "#f59e0b",
    glow: "rgba(245,158,11,0.1)",
  };

  const graphEdges = edges.map((edge) => ({
    id: `entity:${edge.id}`,
    source: edge.sourceId,
    target: edge.targetId,
    label: edge.relation.replaceAll("_", " "),
    type: "canvas-edge",
    data: {
      palette: entityPalette,
      onDelete: () => handlers.onDeleteRelation?.(edge.id),
      onZoom: () => handlers.onZoomEdge?.(`entity:${edge.id}`),
    },
    interactionWidth: 20,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: entityPalette.stroke,
    },
  })) satisfies Edge<CanvasGraphEdgeData>[];

  const localEdges = canvasEdges.map((edge) => {
    const direction = edge.direction ?? "unidirectional";
    const color = edge.color ?? CANVAS_EDGE_COLORS[0];
    const palette = {
      stroke: color,
      selectedStroke: color,
      glow: `${color}55`,
    };

    return {
      id: `canvas:${edge.id}`,
      source: edge.sourceId,
      sourceHandle: edge.sourceHandle,
      target: edge.targetId,
      targetHandle: edge.targetHandle,
      label: edge.relation,
      type: "canvas-edge",
      data: {
        palette,
        onDelete: () => handlers.onDeleteCanvasEdge?.(edge.id),
        onChangeColor: () => handlers.onChangeCanvasEdgeColor?.(edge.id),
        onChangeDirection: () =>
          handlers.onChangeCanvasEdgeDirection?.(edge.id),
        onEditRelation: () => handlers.onEditCanvasEdgeRelation?.(edge.id),
        onEdit: () => handlers.onUpdateCanvasEdge?.(edge.id),
        onZoom: () => handlers.onZoomEdge?.(`canvas:${edge.id}`),
      },
      interactionWidth: 20,
      markerStart:
        direction === "bidirectional"
          ? {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color,
            }
          : undefined,
      markerEnd:
        direction === "none"
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
              color,
            },
    } satisfies Edge<CanvasGraphEdgeData>;
  });

  return [...graphEdges, ...localEdges];
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
  onConnectNodes,
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
  onConnectNodes?: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => Promise<void>;
  onCreateBlock: (position?: { x: number; y: number }) => void;
}) {
  const [nodes, setNodes] = useState<Node<AnyCanvasNodeData>[]>(graphNodes);
  const [edges, setEdges] = useState<Edge<CanvasGraphEdgeData>[]>(graphEdges);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [timelinePaletteOpen, setTimelinePaletteOpen] = useState(false);
  const pointerPlacementRef = useRef<{ x: number; y: number } | null>(null);
  const [guideLines, setGuideLines] = useState<{
    x: number | null;
    y: number | null;
  }>({
    x: null,
    y: null,
  });
  const draggingNodeIdRef = useRef<string | null>(null);
  const dragConsumedClickRef = useRef(false);
  const pendingSnapRef = useRef<{ x: number; y: number } | null>(null);
  const lastGuideSignatureRef = useRef<string | null>(null);
  const nodesRef = useRef<Node<AnyCanvasNodeData>[]>(graphNodes);
  const edgesRef = useRef<Edge<CanvasGraphEdgeData>[]>(graphEdges);
  const reactFlow = useReactFlow<AnyCanvasNodeData>();
  const historyRef = useRef<Node<AnyCanvasNodeData>[][]>([]);
  const historyIndexRef = useRef(-1);

  const commitCanvasBlocks = useCallback(
    (snapshot: Node<AnyCanvasNodeData>[]) => {
      onCanvasBlocksCommit?.(fromCanvasLocalNodes(snapshot));
    },
    [onCanvasBlocksCommit],
  );

  const handleCycleCanvasBlockColor = useCallback(
    (id: string) => {
      setNodes((currentNodes) => {
        const next = currentNodes.map((node) => {
          if (node.id !== id || !isCanvasLocalNodeType(node.type)) {
            return node;
          }

          const color =
            node.type === "canvas-memo"
              ? (node.data as CanvasMemoBlockData).color
              : (node.data as CanvasTimelineBlockData).color;
          const current = color ?? CANVAS_EDGE_COLORS[0];
          const index = CANVAS_EDGE_COLORS.indexOf(
            current as (typeof CANVAS_EDGE_COLORS)[number],
          );
          const nextColor =
            CANVAS_EDGE_COLORS[
              (Math.max(0, index) + 1) % CANVAS_EDGE_COLORS.length
            ];

          return {
            ...node,
            data: {
              ...node.data,
              color: nextColor,
            },
          };
        });

        commitCanvasBlocks(next);
        return next;
      });
    },
    [commitCanvasBlocks],
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const handleZoomEdgeInSurface = useCallback(
    (edgeId: string) => {
      const edge = edgesRef.current.find((item) => item.id === edgeId);
      if (!edge) {
        return;
      }

      const source = nodesRef.current.find((item) => item.id === edge.source);
      const target = nodesRef.current.find((item) => item.id === edge.target);
      if (!source || !target) {
        return;
      }

      const sourceSize = getNodeDimensions(source);
      const targetSize = getNodeDimensions(target);
      const minX = Math.min(source.position.x, target.position.x);
      const minY = Math.min(source.position.y, target.position.y);
      const maxX = Math.max(
        source.position.x + sourceSize.width,
        target.position.x + targetSize.width,
      );
      const maxY = Math.max(
        source.position.y + sourceSize.height,
        target.position.y + targetSize.height,
      );

      void reactFlow.fitBounds(
        {
          x: minX,
          y: minY,
          width: Math.max(120, maxX - minX),
          height: Math.max(80, maxY - minY),
        },
        {
          padding: 0.35,
          duration: 220,
        },
      );
    },
    [reactFlow],
  );

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
        onTimelineMetaChange: (id, patch) => {
          setNodes((innerCurrent) => {
            const next = innerCurrent.map((node) => {
              if (node.id !== id || node.type !== "canvas-timeline") {
                return node;
              }

              return {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              };
            });

            commitCanvasBlocks(next);
            return next;
          });
        },
        onBlockColorChange: handleCycleCanvasBlockColor,
      });

      return syncCanvasLocalNodes(
        currentNodes,
        incomingCanvasNodes,
        draggingNodeIdRef.current,
      );
    });
  }, [canvasBlocks, commitCanvasBlocks, handleCycleCanvasBlockColor]);

  useEffect(() => {
    setEdges(
      decorateEdges(
        graphEdges.map((edge) => {
          const palette = edge.data?.palette ?? {
            stroke: "rgba(255,255,255,0.12)",
            selectedStroke: "#f59e0b",
            glow: "rgba(245,158,11,0.1)",
          };

          return {
            ...edge,
            data: {
              ...edge.data,
              palette,
              onZoom: () => handleZoomEdgeInSurface(edge.id),
            },
          };
        }),
        selectedEdgeId,
      ),
    );
  }, [graphEdges, handleZoomEdgeInSurface, selectedEdgeId]);

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
    const viewportReader = reactFlow.getViewport;
    const { x, y, zoom } =
      typeof viewportReader === "function"
        ? viewportReader()
        : { x: 0, y: 0, zoom: 1 };
    const el = document.querySelector(".react-flow");
    const width = el?.clientWidth ?? 800;
    const height = el?.clientHeight ?? 600;
    return {
      x: (-x + width / 2) / zoom - 140,
      y: (-y + height / 2) / zoom - 60,
    };
  }, [reactFlow]);

  const resolvePlacementPosition = useCallback((): XYPosition => {
    const screen = pointerPlacementRef.current;
    if (!screen) {
      return getViewportCenter();
    }

    const project = reactFlow.screenToFlowPosition;
    if (typeof project === "function") {
      return project(screen);
    }

    return screen;
  }, [getViewportCenter, reactFlow]);

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
    const position = resolvePlacementPosition();
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
        color: undefined,
        onDelete: handleDeleteLocalNode,
        onChangeColor: handleCycleCanvasBlockColor,
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
    handleCycleCanvasBlockColor,
    handleDeleteLocalNode,
    handleMemoDataChange,
    pushHistory,
    resolvePlacementPosition,
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

  const handleUpdateTimelineMeta = useCallback(
    (nodeId: string, patch: Partial<CanvasTimelineBlockData>) => {
      setNodes((current) => {
        const next = current.map((node) => {
          if (node.id !== nodeId || node.type !== "canvas-timeline") {
            return node;
          }

          return {
            ...node,
            data: {
              ...node.data,
              ...patch,
            },
          };
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
      const position = resolvePlacementPosition();
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
          color: CANVAS_EDGE_COLORS[0],
          onDataChange: (targetId, patch) => {
            handleUpdateTimelineMeta(targetId, patch);
          },
          onChangeColor: handleCycleCanvasBlockColor,
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
      resolvePlacementPosition,
      handleDeleteLocalNode,
      handleCycleCanvasBlockColor,
      handleUpdateTimelineMeta,
      handleUpdateTimelineSequence,
      onSelectNode,
    ],
  );

  const handleCreateTimelineBlock = useCallback(() => {
    const position = resolvePlacementPosition();
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
        color: CANVAS_EDGE_COLORS[0],
        onDataChange: (targetId, patch) => {
          handleUpdateTimelineMeta(targetId, patch);
        },
        onChangeColor: handleCycleCanvasBlockColor,
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
    handleCycleCanvasBlockColor,
    handleDeleteLocalNode,
    handleUpdateTimelineMeta,
    handleUpdateTimelineSequence,
    pushHistory,
    resolvePlacementPosition,
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
    if (!connection.source || !connection.target || !onConnectNodes) return;
    void onConnectNodes({
      sourceId: connection.source,
      targetId: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
    });
  };

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return false;
      }

      if (connection.source === connection.target) {
        return false;
      }

      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      if (
        (sourceNode.type === "canvas-timeline" &&
          (isTimelineInternalHandle(connection.sourceHandle) ||
            !isTimelineRootHandle(connection.sourceHandle))) ||
        (targetNode.type === "canvas-timeline" &&
          (isTimelineInternalHandle(connection.targetHandle) ||
            !isTimelineRootHandle(connection.targetHandle)))
      ) {
        return false;
      }

      return !edges.some((edge) => {
        const sameForward =
          edge.source === connection.source &&
          edge.target === connection.target &&
          (edge.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
          (edge.targetHandle ?? null) === (connection.targetHandle ?? null);
        const sameReverse =
          edge.source === connection.target &&
          edge.target === connection.source &&
          (edge.sourceHandle ?? null) === (connection.targetHandle ?? null) &&
          (edge.targetHandle ?? null) === (connection.sourceHandle ?? null);
        return sameForward || sameReverse;
      });
    },
    [edges, nodes],
  );

  const viewportReader = reactFlow.getViewport;
  const viewport =
    typeof viewportReader === "function"
      ? viewportReader()
      : { x: 0, y: 0, zoom: 1 };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "0") {
        event.preventDefault();
        void reactFlow.fitView({ padding: 0.2, duration: 220 });
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "=") {
        event.preventDefault();
        void reactFlow.zoomIn({ duration: 180 });
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "-") {
        event.preventDefault();
        void reactFlow.zoomOut({ duration: 180 });
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [reactFlow]);
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
        isValidConnection={isValidConnection}
        onNodeClick={(_, node) => {
          if (dragConsumedClickRef.current) {
            dragConsumedClickRef.current = false;
            return;
          }
          onSelectNode(node.id);
        }}
        onMoveStart={() => {
          dragConsumedClickRef.current = true;
        }}
        onMoveEnd={() => {
          window.setTimeout(() => {
            dragConsumedClickRef.current = false;
          }, 0);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
          onSelectNode(null);
        }}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          onSelectNode(null);
        }}
        onPaneMouseMove={(event) => {
          pointerPlacementRef.current = {
            x: event.clientX,
            y: event.clientY,
          };
        }}
        onNodesDelete={(deletedNodes) => {
          deletedNodes.forEach((node) => {
            if (node.type === "custom-entity") onDeleteNode?.(node.id);
          });
          setSelectedEdgeId(null);
        }}
        onEdgesDelete={(deletedEdges) => {
          deletedEdges.forEach((edge) => {
            edge.data?.onDelete?.(edge.id);
          });
        }}
        onNodeDragStart={(_, node) => {
          draggingNodeIdRef.current = node.id;
          dragConsumedClickRef.current = true;
          pendingSnapRef.current = null;
          onSelectNode(null);
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

          pendingSnapRef.current =
            snapX !== node.position.x || snapY !== node.position.y
              ? { x: snapX, y: snapY }
              : null;
        }}
        onNodeDragStop={(_, node) => {
          draggingNodeIdRef.current = null;
          setGuideLines({ x: null, y: null });
          lastGuideSignatureRef.current = null;

          const pendingSnap = pendingSnapRef.current;
          pendingSnapRef.current = null;

          if (pendingSnap) {
            setNodes((currentNodes) =>
              currentNodes.map((currentNode) => {
                if (currentNode.id !== node.id) {
                  return currentNode;
                }
                return {
                  ...currentNode,
                  position: {
                    x: pendingSnap.x,
                    y: pendingSnap.y,
                  },
                };
              }),
            );
          }

          const currentNode = nodesRef.current.find(
            (item) => item.id === node.id,
          );
          const position =
            pendingSnap ?? currentNode?.position ?? node.position;

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

          window.setTimeout(() => {
            dragConsumedClickRef.current = false;
          }, 0);
        }}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Control"]}
        panOnDrag={true}
        panOnScroll={false}
        zoomOnScroll
        selectionOnDrag={false}
        selectNodesOnDrag={false}
        selectionMode={SelectionMode.Partial}
        onlyRenderVisibleElements
        connectionMode={"loose" as ConnectionMode}
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
        onCreateBlock={() => onCreateBlock(resolvePlacementPosition())}
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
  canvasEdges,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCanvasBlocksCommit,
  onCanvasEdgesCommit,
  onNodePositionCommit,
  onDeleteNode,
  onCreateCanvasRelation,
  onDeleteRelation,
  onCreateBlock,
  onAddTimelineBranch,
}: CanvasViewProps) {
  const handleCycleGraphNodeColor = useCallback(
    (nodeId: string) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) {
        return;
      }

      if (node.entityType === "Event") {
        return;
      }

      const attributes =
        node.attributes && typeof node.attributes === "object"
          ? (node.attributes as Record<string, unknown>)
          : {};
      const current =
        typeof attributes.canvasColor === "string"
          ? attributes.canvasColor
          : CANVAS_EDGE_COLORS[0];
      const index = CANVAS_EDGE_COLORS.indexOf(
        current as (typeof CANVAS_EDGE_COLORS)[number],
      );
      const nextColor =
        CANVAS_EDGE_COLORS[
          (Math.max(0, index) + 1) % CANVAS_EDGE_COLORS.length
        ];

      const payload = {
        ...attributes,
        canvasColor: nextColor,
      };

      void api.worldEntity.update({
        id: node.id,
        type: node.subType ?? "Concept",
        attributes: payload,
      });
    },
    [nodes],
  );

  const handleEditGraphNode = useCallback(
    (nodeId: string) => {
      onSelectNode(nodeId);
    },
    [onSelectNode],
  );

  const flowNodes = useMemo(
    () =>
      buildFlowNodes(
        nodes,
        onDeleteNode,
        handleCycleGraphNodeColor,
        handleEditGraphNode,
        onAddTimelineBranch,
      ),
    [
      handleCycleGraphNodeColor,
      handleEditGraphNode,
      nodes,
      onDeleteNode,
      onAddTimelineBranch,
    ],
  );
  const commitCanvasEdges = useCallback(
    (nextEdges: WorldGraphCanvasEdge[]) => {
      onCanvasEdgesCommit?.(nextEdges);
    },
    [onCanvasEdgesCommit],
  );

  const handleDeleteCanvasEdge = useCallback(
    (edgeId: string) => {
      commitCanvasEdges(canvasEdges.filter((edge) => edge.id !== edgeId));
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleCycleCanvasEdgeColor = useCallback(
    (edgeId: string) => {
      const nextEdges = canvasEdges.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }

        const current = edge.color ?? CANVAS_EDGE_COLORS[0];
        const colorIndex = CANVAS_EDGE_COLORS.indexOf(
          current as (typeof CANVAS_EDGE_COLORS)[number],
        );
        const nextColor =
          CANVAS_EDGE_COLORS[
            (Math.max(0, colorIndex) + 1) % CANVAS_EDGE_COLORS.length
          ];

        return {
          ...edge,
          color: nextColor,
        };
      });

      commitCanvasEdges(nextEdges);
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleCycleCanvasEdgeDirection = useCallback(
    (edgeId: string) => {
      const nextEdges = canvasEdges.map((edge) => {
        if (edge.id !== edgeId) {
          return edge;
        }

        const current: WorldGraphCanvasEdgeDirection =
          edge.direction ?? "unidirectional";
        const nextDirection: WorldGraphCanvasEdgeDirection =
          current === "unidirectional"
            ? "bidirectional"
            : current === "bidirectional"
              ? "none"
              : "unidirectional";

        return {
          ...edge,
          direction: nextDirection,
        };
      });

      commitCanvasEdges(nextEdges);
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleEditCanvasEdgeRelation = useCallback(
    (edgeId: string) => {
      const target = canvasEdges.find((edge) => edge.id === edgeId);
      if (!target) {
        return;
      }

      const nextRelation = window.prompt("관계를 입력하세요", target.relation);
      if (nextRelation === null) {
        return;
      }

      const trimmed = nextRelation.trim();
      if (trimmed.length === 0) {
        return;
      }

      commitCanvasEdges(
        canvasEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                relation: trimmed,
              }
            : edge,
        ),
      );
    },
    [canvasEdges, commitCanvasEdges],
  );

  const handleUpdateCanvasEdge = useCallback(
    (edgeId: string) => {
      const target = canvasEdges.find((edge) => edge.id === edgeId);
      if (!target) {
        return;
      }

      const nextRelation = window.prompt(
        "수정할 관계명을 입력하세요",
        target.relation,
      );
      if (nextRelation === null) {
        return;
      }

      const trimmed = nextRelation.trim();
      if (trimmed.length === 0) {
        return;
      }

      commitCanvasEdges(
        canvasEdges.map((edge) =>
          edge.id === edgeId
            ? {
                ...edge,
                relation: trimmed,
              }
            : edge,
        ),
      );
    },
    [canvasEdges, commitCanvasEdges],
  );

  const flowEdges = useMemo(
    () =>
      buildFlowEdges(edges, canvasEdges, {
        onDeleteRelation: (id) => void onDeleteRelation?.(id),
        onDeleteCanvasEdge: handleDeleteCanvasEdge,
        onChangeCanvasEdgeColor: handleCycleCanvasEdgeColor,
        onChangeCanvasEdgeDirection: handleCycleCanvasEdgeDirection,
        onEditCanvasEdgeRelation: handleEditCanvasEdgeRelation,
        onUpdateCanvasEdge: handleUpdateCanvasEdge,
      }),
    [
      canvasEdges,
      edges,
      handleCycleCanvasEdgeColor,
      handleCycleCanvasEdgeDirection,
      handleDeleteCanvasEdge,
      handleEditCanvasEdgeRelation,
      handleUpdateCanvasEdge,
      onDeleteRelation,
    ],
  );

  const handleConnectNodes = useCallback(
    async ({
      sourceId,
      targetId,
      sourceHandle,
      targetHandle,
    }: {
      sourceId: string;
      targetId: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      if (sourceId === targetId) {
        return;
      }

      const normalize = (value?: string | null) => value ?? null;
      const sourceKey = normalize(sourceHandle);
      const targetKey = normalize(targetHandle);
      const existing = canvasEdges.some((edge) => {
        const edgeSourceKey = normalize(edge.sourceHandle);
        const edgeTargetKey = normalize(edge.targetHandle);
        const sameForward =
          edge.sourceId === sourceId &&
          edge.targetId === targetId &&
          edgeSourceKey === sourceKey &&
          edgeTargetKey === targetKey;
        const sameReverse =
          edge.sourceId === targetId &&
          edge.targetId === sourceId &&
          edgeSourceKey === targetKey &&
          edgeTargetKey === sourceKey;
        return sameForward || sameReverse;
      });
      if (existing) {
        return;
      }

      if (onCreateCanvasRelation) {
        await onCreateCanvasRelation({
          sourceId,
          targetId,
          sourceHandle,
          targetHandle,
        });
      }
    },
    [canvasEdges, onCreateCanvasRelation],
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
          onConnectNodes={handleConnectNodes}
          timelineNodes={timelineNodes}
          selectedNodeId={selectedNodeId}
          autoLayoutTrigger={autoLayoutTrigger}
          onSelectNode={onSelectNode}
          onCanvasBlocksCommit={onCanvasBlocksCommit}
          onNodePositionCommit={onNodePositionCommit}
          onDeleteNode={onDeleteNode}
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
