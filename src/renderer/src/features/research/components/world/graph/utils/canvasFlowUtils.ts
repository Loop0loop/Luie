import { MarkerType, type Edge, type Node } from "reactflow";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphCanvasMemoBlockData,
  WorldGraphCanvasTimelineBlockData,
  WorldGraphNode,
} from "@shared/types";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import type { CanvasTimelineBlockData } from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import {
  GRAPH_CANVAS_DEFAULT_EDGE_COLORS,
  GRAPH_CANVAS_GUIDE_SNAP_DISTANCE_PX,
  GRAPH_CANVAS_NODE_DEFAULT_HEIGHT_PX,
  GRAPH_CANVAS_NODE_DEFAULT_WIDTH_PX,
  GRAPH_CANVAS_RELATION_HINT_EDGE_PREFIX,
  GRAPH_DEFAULT_NODE_COLUMN_GAP_PX,
  GRAPH_DEFAULT_NODE_OFFSET_X_PX,
  GRAPH_DEFAULT_NODE_OFFSET_Y_PX,
  GRAPH_DEFAULT_NODE_ROW_GAP_PX,
  GRAPH_ENTITY_CANVAS_THEME_TOKENS,
} from "../shared";

export type AnyCanvasNodeData =
  | CanvasGraphNodeData
  | CanvasTimelineBlockData
  | CanvasMemoBlockData;

export const SMART_GUIDE_SNAP_PX = GRAPH_CANVAS_GUIDE_SNAP_DISTANCE_PX;
export const DEFAULT_NODE_WIDTH = GRAPH_CANVAS_NODE_DEFAULT_WIDTH_PX;
export const DEFAULT_NODE_HEIGHT = GRAPH_CANVAS_NODE_DEFAULT_HEIGHT_PX;
export const CANVAS_EDGE_COLORS = GRAPH_CANVAS_DEFAULT_EDGE_COLORS;

export const ENTITY_RELATION_HINT_EDGE_PREFIX =
  GRAPH_CANVAS_RELATION_HINT_EDGE_PREFIX;

export const buildEntityRelationHintEdgeId = (relationId: string): string =>
  `${ENTITY_RELATION_HINT_EDGE_PREFIX}${relationId}`;

export const isEntityRelationHintEdge = (edgeId: string): boolean =>
  edgeId.startsWith(ENTITY_RELATION_HINT_EDGE_PREFIX);

export const parseEntityRelationHintId = (edgeId: string): string | null => {
  if (!isEntityRelationHintEdge(edgeId)) {
    return null;
  }
  const relationId = edgeId.slice(ENTITY_RELATION_HINT_EDGE_PREFIX.length);
  return relationId.length > 0 ? relationId : null;
};

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
  const date = record["date"];
  if (typeof date === "string" && date.trim().length > 0) {
    return date;
  }

  const time = record["time"];
  return typeof time === "string" && time.trim().length > 0 ? time : undefined;
};

export const isTimelineInternalHandle = (handleId?: string | null): boolean => {
  if (!handleId) {
    return false;
  }
  return /-(?:t|b)-(?:in|out)$/.test(handleId);
};

export const isCanvasLocalNodeType = (
  nodeType: string | undefined,
): nodeType is "canvas-timeline" | "canvas-memo" =>
  nodeType === "canvas-timeline" || nodeType === "canvas-memo";

export const toCanvasBlockNodes = (
  blocks: WorldGraphCanvasBlock[],
  input: {
    onDelete?: (id: string) => void;
    onBlockColorChange: (id: string) => void;
    onMemoChange: (
      id: string,
      patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
    ) => void;
    onTimelineChange: (
      id: string,
      patch: Partial<
        Omit<
          CanvasTimelineBlockData,
          "onChangeColor" | "onDataChange" | "onDelete" | "onAddBranch"
        >
      >,
    ) => void;
    onAddBranch?: (
      id: string,
      direction: "up" | "down" | "left" | "right",
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
        content: block.data.content,
        isHeld: block.data.isHeld,
        color: block.data.color,
        onDataChange: input.onTimelineChange,
        onChangeColor: input.onBlockColorChange,
        onDelete: input.onDelete,
        onAddBranch: (
          id: string,
          direction: "up" | "down" | "left" | "right",
        ) => {
          if (input.onAddBranch) {
            input.onAddBranch(id, direction);
          }
        },
      } satisfies CanvasTimelineBlockData,
    };
  });

export const fromCanvasLocalNodes = (
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
        content: typeof data.content === "string" ? data.content : "",
        isHeld: typeof data.isHeld === "boolean" ? data.isHeld : false,
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

export const syncCanvasLocalNodes = (
  currentNodes: Node<AnyCanvasNodeData>[],
  incomingCanvasNodes: Node<AnyCanvasNodeData>[],
  lockedNodeId: string | null,
): Node<AnyCanvasNodeData>[] => {
  const nonLocal = currentNodes.filter(
    (node) => !isCanvasLocalNodeType(node.type),
  );
  const nextLocal = incomingCanvasNodes.map((incoming) => {
    const current = currentNodes.find((node) => node.id === incoming.id);
    if (!current) {
      return incoming;
    }

    const preserveCurrentData = incoming.id === lockedNodeId;

    return {
      ...incoming,
      position:
        incoming.id === lockedNodeId ? current.position : incoming.position,
      selected: current.selected,
      data: preserveCurrentData ? current.data : incoming.data,
    };
  });

  return [...nonLocal, ...nextLocal];
};

export function readPosition(node: WorldGraphNode, index: number) {
  const fallbackColumn = index % 4;
  const fallbackRow = Math.floor(index / 4);

  return {
    x:
      Number.isFinite(node.positionX) && node.positionX !== 0
        ? node.positionX
        : GRAPH_DEFAULT_NODE_OFFSET_X_PX +
          fallbackColumn * GRAPH_DEFAULT_NODE_COLUMN_GAP_PX,
    y:
      Number.isFinite(node.positionY) && node.positionY !== 0
        ? node.positionY
        : GRAPH_DEFAULT_NODE_OFFSET_Y_PX +
          fallbackRow * GRAPH_DEFAULT_NODE_ROW_GAP_PX,
  };
}

export function decorateEdges(
  edges: Edge<CanvasGraphEdgeData>[],
  selectedEdgeId: string | null,
): Edge<CanvasGraphEdgeData>[] {
  return edges.map((edge) => ({
    ...edge,
    selected: edge.id === selectedEdgeId,
  }));
}

export const buildFlowNodes = (
  nodes: WorldGraphNode[],
  onDeleteNode?: (nodeId: string) => void,
  onNodeColorChange?: (nodeId: string) => void,
  onNodeEdit?: (nodeId: string) => void,
  onAddTimelineBranch?: (
    sourceNodeId: string,
    direction: "up" | "down" | "left" | "right",
  ) => void,
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
          ? ((node.attributes as Record<string, unknown>)["canvasColor"] as
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

export const buildFlowEdges = (
  edges: EntityRelation[],
  canvasEdges: WorldGraphCanvasEdge[],
  handlers: {
    onDeleteRelation?: (id: string) => void;
    onDeleteCanvasEdge?: (id: string) => void;
    onChangeCanvasEdgeColor?: (id: string, color: string) => void;
    onChangeCanvasEdgeDirection?: (
      id: string,
      direction: "unidirectional" | "bidirectional" | "none",
    ) => void;
    onEditCanvasEdgeRelation?: (id: string) => void;
    onUpdateCanvasEdge?: (id: string) => void;
    onZoomEdge?: (id: string) => void;
  },
): Edge<CanvasGraphEdgeData>[] => {
  const relationHandleHints = new Map(
    canvasEdges
      .map((edge) => {
        const relationId = parseEntityRelationHintId(edge.id);
        if (!relationId) {
          return null;
        }
        return [relationId, edge] as const;
      })
      .filter(
        (entry): entry is readonly [string, WorldGraphCanvasEdge] =>
          entry !== null,
      ),
  );

  const entityPalette = {
    stroke: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.edge,
    selectedStroke: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.selectedEdge,
    glow: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.glow,
  };

  const graphEdges = edges.map((edge) => {
    const relationHint = relationHandleHints.get(edge.id);

    return {
      id: `entity:${edge.id}`,
      source: edge.sourceId,
      sourceHandle: relationHint?.sourceHandle,
      target: edge.targetId,
      targetHandle: relationHint?.targetHandle,
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
    } satisfies Edge<CanvasGraphEdgeData>;
  });

  const localEdges = canvasEdges
    .filter((edge) => !isEntityRelationHintEdge(edge.id))
    .map((edge) => {
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
          onChangeColor: (_id: string, nextColor: string) =>
            handlers.onChangeCanvasEdgeColor?.(edge.id, nextColor),
          onChangeDirection: (
            _id: string,
            nextDirection: "unidirectional" | "bidirectional" | "none",
          ) => handlers.onChangeCanvasEdgeDirection?.(edge.id, nextDirection),
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

export function mergeIncomingNodes(
  currentNodes: Node<AnyCanvasNodeData>[],
  incomingNodes: Node<CanvasGraphNodeData>[],
  lockedNodeId: string | null,
): Node<AnyCanvasNodeData>[] {
  const currentById = new Map(currentNodes.map((node) => [node.id, node]));
  const incomingIds = new Set(incomingNodes.map((node) => node.id));

  const localNodes = currentNodes.filter(
    (node) => node.type === "canvas-timeline" || node.type === "canvas-memo",
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

  const preservedLocals = localNodes.filter(
    (node) => !incomingIds.has(node.id),
  );
  return [...merged, ...preservedLocals];
}

let localNodeCounter = 0;
export function generateLocalId(prefix: string) {
  localNodeCounter += 1;
  return `${prefix}-${Date.now()}-${localNodeCounter}`;
}

export type AxisGuide = {
  guide: number;
  snapped: number;
};

export const getNodeDimensions = (node: Node<AnyCanvasNodeData>) => ({
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

export const findBestAxisGuide = (
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
