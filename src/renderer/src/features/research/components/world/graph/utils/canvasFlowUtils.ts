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
  GRAPH_CANVAS_GUIDE_SNAP_DISTANCE_PX,
  GRAPH_CANVAS_DEFAULT_EDGE_COLORS,
  GRAPH_CANVAS_NODE_DEFAULT_WIDTH_PX,
  GRAPH_CANVAS_NODE_DEFAULT_HEIGHT_PX,
  GRAPH_CANVAS_RELATION_HINT_EDGE_PREFIX,
} from "../shared/canvas/graphCanvasConstants";
import {
  GRAPH_DEFAULT_NODE_COLUMNS,
  GRAPH_DEFAULT_NODE_COLUMN_GAP_PX,
  GRAPH_DEFAULT_NODE_OFFSET_X_PX,
  GRAPH_DEFAULT_NODE_OFFSET_Y_PX,
  GRAPH_DEFAULT_NODE_ROW_GAP_PX,
} from "../shared/layout/graphLayoutConstants";
import { GRAPH_ENTITY_CANVAS_THEME_TOKENS } from "../shared/theme/graphThemeConstants";

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

type CanvasHandleDirection = "source" | "target";
type CanvasHandleSide = "top" | "bottom" | "left" | "right";
export type CanvasEndpointNodeKind = "graph" | "canvas" | "unknown";

const HANDLE_DIRECTION_ALIASES: Record<string, CanvasHandleDirection> = {
  source: "source",
  out: "source",
  target: "target",
  in: "target",
};

const HANDLE_SIDE_ALIASES: Record<string, CanvasHandleSide> = {
  t: "top",
  top: "top",
  b: "bottom",
  bottom: "bottom",
  l: "left",
  left: "left",
  r: "right",
  right: "right",
};

const parseHandleToken = (
  handle: string,
): { side: CanvasHandleSide; direction: CanvasHandleDirection } | null => {
  const parts = handle.split("-");
  if (parts.length !== 2) {
    return null;
  }

  const [rawSide, rawDirection] = parts;
  const side = HANDLE_SIDE_ALIASES[rawSide.toLowerCase()];
  const direction = HANDLE_DIRECTION_ALIASES[rawDirection.toLowerCase()];
  if (!side || !direction) {
    return null;
  }

  return { side, direction };
};

export const resolveCanvasEndpointNodeKind = (
  nodeId: string,
  graphNodeIds: ReadonlySet<string>,
  canvasBlockIds: ReadonlySet<string>,
): CanvasEndpointNodeKind => {
  if (graphNodeIds.has(nodeId)) {
    return "graph";
  }
  if (canvasBlockIds.has(nodeId)) {
    return "canvas";
  }
  return "unknown";
};

export const canonicalizeHandleForNodeKind = (
  handle: string | null | undefined,
  nodeKind: CanvasEndpointNodeKind,
): string | undefined => {
  if (typeof handle !== "string" || handle.length === 0) {
    return undefined;
  }

  const parsed = parseHandleToken(handle);
  if (!parsed) {
    return undefined;
  }

  if (nodeKind === "graph") {
    const side = parsed.side[0];
    const direction = parsed.direction === "source" ? "source" : "target";
    return `${side}-${direction}`;
  }

  if (nodeKind === "canvas") {
    const direction = parsed.direction === "source" ? "out" : "in";
    return `${parsed.side}-${direction}`;
  }

  return undefined;
};

export type NormalizedHandlePairForNodeKinds = {
  sourceHandle: string;
  targetHandle: string;
  orientation: "canonical" | "reversed";
};

export const normalizeHandlePairForNodeKinds = (input: {
  sourceHandle: string | null | undefined;
  targetHandle: string | null | undefined;
  sourceNodeKind: CanvasEndpointNodeKind;
  targetNodeKind: CanvasEndpointNodeKind;
}): NormalizedHandlePairForNodeKinds | null => {
  const source = canonicalizeHandleForNodeKind(
    input.sourceHandle,
    input.sourceNodeKind,
  );
  const target = canonicalizeHandleForNodeKind(
    input.targetHandle,
    input.targetNodeKind,
  );

  if (!source || !target) {
    return null;
  }

  const sourceIsSourceHandle =
    source.endsWith("-source") || source.endsWith("-out");
  const sourceIsTargetHandle =
    source.endsWith("-target") || source.endsWith("-in");
  const targetIsSourceHandle =
    target.endsWith("-source") || target.endsWith("-out");
  const targetIsTargetHandle =
    target.endsWith("-target") || target.endsWith("-in");

  if (sourceIsTargetHandle && targetIsSourceHandle) {
    return {
      sourceHandle: target,
      targetHandle: source,
      orientation: "reversed",
    };
  }

  if (!sourceIsSourceHandle || !targetIsTargetHandle) {
    return null;
  }

  return {
    sourceHandle: source,
    targetHandle: target,
    orientation: "canonical",
  };
};

const dedupeByIdLastWins = <T extends { id: string }>(
  items: readonly T[],
): T[] => {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const item = items[index];
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    deduped.unshift(item);
  }

  return deduped;
};

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

  return dedupeByIdLastWins(blocks);
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

  return dedupeByIdLastWins([...nonLocal, ...nextLocal]);
};

export function readPosition(node: WorldGraphNode, index: number) {
  const fallbackColumn = index % GRAPH_DEFAULT_NODE_COLUMNS;
  const fallbackRow = Math.floor(index / GRAPH_DEFAULT_NODE_COLUMNS);

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
  return dedupeByIdLastWins(nodes).map((node, index) => ({
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
  nodeContext: {
    graphNodeIds: ReadonlySet<string>;
    canvasBlockIds: ReadonlySet<string>;
  },
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
  const normalizedEdges = dedupeByIdLastWins(edges);
  const normalizedCanvasEdges = dedupeByIdLastWins(canvasEdges);

  const relationHandleHints = new Map(
    normalizedCanvasEdges
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

  const graphEdges = normalizedEdges.map((edge) => {
    const relationHint = relationHandleHints.get(edge.id);
    const sourceNodeKind = resolveCanvasEndpointNodeKind(
      edge.sourceId,
      nodeContext.graphNodeIds,
      nodeContext.canvasBlockIds,
    );
    const targetNodeKind = resolveCanvasEndpointNodeKind(
      edge.targetId,
      nodeContext.graphNodeIds,
      nodeContext.canvasBlockIds,
    );
    const normalizedHint = normalizeHandlePairForNodeKinds({
      sourceHandle: relationHint?.sourceHandle,
      targetHandle: relationHint?.targetHandle,
      sourceNodeKind,
      targetNodeKind,
    });

    return {
      id: `entity:${edge.id}`,
      source: edge.sourceId,
      sourceHandle: normalizedHint?.sourceHandle,
      target: edge.targetId,
      targetHandle: normalizedHint?.targetHandle,
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

  const localEdges = normalizedCanvasEdges
    .filter((edge) => !isEntityRelationHintEdge(edge.id))
    .map((edge) => {
      const direction = edge.direction ?? "unidirectional";
      const color = edge.color ?? CANVAS_EDGE_COLORS[0];
      const palette = {
        stroke: color,
        selectedStroke: color,
        glow: `${color}55`,
      };
      const sourceNodeKind = resolveCanvasEndpointNodeKind(
        edge.sourceId,
        nodeContext.graphNodeIds,
        nodeContext.canvasBlockIds,
      );
      const targetNodeKind = resolveCanvasEndpointNodeKind(
        edge.targetId,
        nodeContext.graphNodeIds,
        nodeContext.canvasBlockIds,
      );
      const normalizedHandles = normalizeHandlePairForNodeKinds({
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        sourceNodeKind,
        targetNodeKind,
      });

      return {
        id: `canvas:${edge.id}`,
        source: edge.sourceId,
        sourceHandle: normalizedHandles?.sourceHandle,
        target: edge.targetId,
        targetHandle: normalizedHandles?.targetHandle,
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

  return dedupeByIdLastWins([...graphEdges, ...localEdges]);
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
  return dedupeByIdLastWins([...merged, ...preservedLocals]);
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
