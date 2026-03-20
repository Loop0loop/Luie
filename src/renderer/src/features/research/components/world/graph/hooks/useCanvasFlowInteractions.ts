import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "reactflow";
import { api } from "@shared/api";
import type { WorldGraphCanvasBlock } from "@shared/types";
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import {
  decorateEdges,
  findBestAxisGuide,
  getNodeDimensions,
  isCanvasLocalNodeType,
  isTimelineInternalHandle,
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";
import { ENTITY_TYPE_CANVAS_THEME } from "../constants";

type UseCanvasFlowInteractionsInput = {
  graphNodes: Node<any>[];
  graphEdges: Edge<CanvasGraphEdgeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  nodes: Node<AnyCanvasNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<AnyCanvasNodeData>[]>>;
  commitCanvasBlocks: (snapshot: Node<AnyCanvasNodeData>[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onConnectNodes?: (input: {
    sourceId: string;
    targetId: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => Promise<void>;
  onAutoLayoutApplied?: () => void;
  reactFlow: ReactFlowInstance<AnyCanvasNodeData>;
};

export function useCanvasFlowInteractions({
  graphNodes,
  graphEdges,
  canvasBlocks,
  selectedNodeId,
  autoLayoutTrigger,
  nodes,
  setNodes,
  commitCanvasBlocks,
  onSelectNode,
  onNodePositionCommit,
  onDeleteNode,
  onConnectNodes,
  onAutoLayoutApplied,
  reactFlow,
}: UseCanvasFlowInteractionsInput) {
  const [edges, setEdges] = useState<Edge<CanvasGraphEdgeData>[]>(graphEdges);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [guideLines, setGuideLines] = useState<{
    x: number | null;
    y: number | null;
  }>({
    x: null,
    y: null,
  });
  const pointerPlacementRef = useRef<{ x: number; y: number } | null>(null);
  const draggingNodeIdRef = useRef<string | null>(null);
  const dragConsumedClickRef = useRef(false);
  const pendingSnapRef = useRef<{ x: number; y: number } | null>(null);
  const lastGuideSignatureRef = useRef<string | null>(null);
  const lastHapticAtRef = useRef<number>(0);
  const pendingGuideRef = useRef<{ x: number | null; y: number | null } | null>(
    null,
  );
  const guideRafRef = useRef<number | null>(null);
  const nodesRef = useRef<Node<AnyCanvasNodeData>[]>(nodes);
  const edgesRef = useRef<Edge<CanvasGraphEdgeData>[]>(graphEdges);
  const appliedAutoLayoutTriggerRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (guideRafRef.current !== null) {
        window.cancelAnimationFrame(guideRafRef.current);
      }
    };
  }, []);

  const scheduleGuideLines = useCallback(
    (x: number | null, y: number | null) => {
      pendingGuideRef.current = { x, y };
      if (guideRafRef.current !== null) {
        return;
      }

      guideRafRef.current = window.requestAnimationFrame(() => {
        guideRafRef.current = null;
        const next = pendingGuideRef.current;
        if (!next) {
          return;
        }
        setGuideLines((current) => {
          if (current.x === next.x && current.y === next.y) {
            return current;
          }
          return next;
        });
      });
    },
    [],
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
      if (!edge) return;

      const source = nodesRef.current.find((item) => item.id === edge.source);
      const target = nodesRef.current.find((item) => item.id === edge.target);
      if (!source || !target) return;

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
        { padding: 0.35, duration: 220 },
      );
    },
    [reactFlow],
  );

  useEffect(() => {
    setEdges(
      decorateEdges(
        graphEdges.map((edge) => {
          const palette = edge.data?.palette ?? {
            stroke: ENTITY_TYPE_CANVAS_THEME.WorldEntity.edge,
            selectedStroke: ENTITY_TYPE_CANVAS_THEME.WorldEntity.selectedEdge,
            glow: ENTITY_TYPE_CANVAS_THEME.WorldEntity.glow,
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
  }, [selectedNodeId, setNodes]);

  useEffect(() => {
    if (selectedNodeId) setSelectedEdgeId(null);
  }, [selectedNodeId]);

  useEffect(() => {
    if (autoLayoutTrigger === 0) return;
    if (autoLayoutTrigger === appliedAutoLayoutTriggerRef.current) return;

    appliedAutoLayoutTriggerRef.current = autoLayoutTrigger;
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
    onAutoLayoutApplied?.();
    setTimeout(() => {
      void reactFlow.fitView({ padding: 0.24, duration: 300 });
    }, 50);
  }, [autoLayoutTrigger, onAutoLayoutApplied, reactFlow, setNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    },
    [setNodes],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((currentEdges) =>
        decorateEdges(applyEdgeChanges(changes, currentEdges), selectedEdgeId),
      );
      const selectedChange = [...changes]
        .reverse()
        .find((change) => change.type === "select");
      if (selectedChange?.type === "select") {
        setSelectedEdgeId(selectedChange.selected ? selectedChange.id : null);
      }
    },
    [selectedEdgeId],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !onConnectNodes) return;

      // Check for duplicate connection
      const isDuplicate = edgesRef.current
        .filter((edge) => edge.id.startsWith("canvas:"))
        .some((edge) => {
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

      if (isDuplicate) return;

      // Optimistic update: add temporary edge immediately for instant visual feedback
      const tempEdgeId = `canvas:temp-${Date.now()}`;
      const tempEdge: Edge<CanvasGraphEdgeData> = {
        id: tempEdgeId,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: "canvas-edge",
        data: {
          palette: {
            stroke: ENTITY_TYPE_CANVAS_THEME.WorldEntity.edge,
            selectedStroke: ENTITY_TYPE_CANVAS_THEME.WorldEntity.selectedEdge,
            glow: ENTITY_TYPE_CANVAS_THEME.WorldEntity.glow,
          },
          onDelete: () => {},
        },
      };

      setEdges((currentEdges) => [...currentEdges, tempEdge]);

      // Async save - will replace temp edge with real edge via useEffect
      void onConnectNodes({
        sourceId: connection.source,
        targetId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
    },
    [onConnectNodes, setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;

      const nodesSnapshot = nodesRef.current;
      const sourceNode = nodesSnapshot.find(
        (node) => node.id === connection.source,
      );
      const targetNode = nodesSnapshot.find(
        (node) => node.id === connection.target,
      );

      const resolveFallbackType = (nodeId: string) => {
        if (graphNodes.some((node) => node.id === nodeId)) {
          return "custom-entity" as const;
        }

        const block = canvasBlocks.find((node) => node.id === nodeId);
        if (!block) return null;
        return block.type === "memo" ? "canvas-memo" : "canvas-timeline";
      };

      const sourceType =
        sourceNode?.type ?? resolveFallbackType(connection.source);
      const targetType =
        targetNode?.type ?? resolveFallbackType(connection.target);

      if (!sourceType || !targetType) return false;

      if (
        (sourceType === "canvas-timeline" &&
          isTimelineInternalHandle(connection.sourceHandle)) ||
        (targetType === "canvas-timeline" &&
          isTimelineInternalHandle(connection.targetHandle))
      ) {
        return false;
      }

      return !edgesRef.current
        .filter((edge) => edge.id.startsWith("canvas:"))
        .some((edge) => {
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
    [canvasBlocks, graphNodes],
  );

  const viewport = useMemo(() => {
    const viewportReader = reactFlow.getViewport;
    return typeof viewportReader === "function"
      ? viewportReader()
      : { x: 0, y: 0, zoom: 1 };
  }, [reactFlow, guideLines]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) return;

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
    return () => window.removeEventListener("keydown", handler);
  }, [reactFlow]);

  const onNodeClick = useCallback(
    (_event: unknown, node: Node<AnyCanvasNodeData>) => {
      if (dragConsumedClickRef.current) {
        dragConsumedClickRef.current = false;
        return;
      }
      onSelectNode(node.id);
    },
    [onSelectNode],
  );

  const onMoveStart = useCallback(() => {
    dragConsumedClickRef.current = false;
  }, []);

  const onMoveEnd = useCallback(() => {
    window.setTimeout(() => {
      dragConsumedClickRef.current = false;
    }, 0);
  }, []);

  const onEdgeClick = useCallback(
    (_event: unknown, edge: Edge<CanvasGraphEdgeData>) => {
      setSelectedEdgeId(edge.id);
      onSelectNode(null);
    },
    [onSelectNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    onSelectNode(null);
  }, [onSelectNode]);

  const onPaneMouseMove = useCallback((event: MouseEvent | any) => {
    pointerPlacementRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onNodesDelete = useCallback(
    (deletedNodes: Node<AnyCanvasNodeData>[]) => {
      const deletedIds = new Set(deletedNodes.map((node) => node.id));

      deletedNodes.forEach((node) => {
        if (node.type === "custom-entity") onDeleteNode?.(node.id);
      });

      const hasLocalCanvasNode = deletedNodes.some((node) =>
        isCanvasLocalNodeType(node.type),
      );
      if (hasLocalCanvasNode) {
        setNodes((currentNodes) => {
          const next = currentNodes.filter((node) => !deletedIds.has(node.id));
          commitCanvasBlocks(next);
          return next;
        });
      }

      setSelectedEdgeId(null);
    },
    [commitCanvasBlocks, onDeleteNode, setNodes],
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge<CanvasGraphEdgeData>[]) => {
      deletedEdges.forEach((edge) => {
        edge.data?.onDelete?.(edge.id);
      });
    },
    [],
  );

  const onNodeDragStart = useCallback(
    (_event: unknown, node: Node<AnyCanvasNodeData>) => {
      draggingNodeIdRef.current = node.id;
      dragConsumedClickRef.current = false;
      pendingSnapRef.current = null;
      onSelectNode(null);
    },
    [onSelectNode],
  );

  const onNodeDrag = useCallback(
    (_event: unknown, node: Node<AnyCanvasNodeData>) => {
      const allNodes = nodesRef.current;
      const dragged = allNodes.find((item) => item.id === node.id);
      if (!dragged) return;

      const draggingNode: Node<AnyCanvasNodeData> = {
        ...dragged,
        position: { x: node.position.x, y: node.position.y },
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
        const now = Date.now();
        lastGuideSignatureRef.current = signature;
        if (now - lastHapticAtRef.current >= 80) {
          lastHapticAtRef.current = now;
          void api.window.hapticFeedback();
        }
      } else if (!signature) {
        lastGuideSignatureRef.current = null;
      }

      scheduleGuideLines(guideX, guideY);

      pendingSnapRef.current =
        snapX !== node.position.x || snapY !== node.position.y
          ? { x: snapX, y: snapY }
          : null;
    },
    [scheduleGuideLines],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: Node<AnyCanvasNodeData>) => {
      draggingNodeIdRef.current = null;
      scheduleGuideLines(null, null);
      lastGuideSignatureRef.current = null;

      const pendingSnap = pendingSnapRef.current;
      pendingSnapRef.current = null;

      if (isCanvasLocalNodeType(node.type)) {
        setNodes((currentNodes) => {
          const nextNodes = pendingSnap
            ? currentNodes.map((currentNode) =>
                currentNode.id !== node.id
                  ? currentNode
                  : {
                      ...currentNode,
                      position: { x: pendingSnap.x, y: pendingSnap.y },
                    },
              )
            : currentNodes;
          commitCanvasBlocks(nextNodes);
          return nextNodes;
        });
      } else if (pendingSnap) {
        setNodes((currentNodes) =>
          currentNodes.map((currentNode) =>
            currentNode.id !== node.id
              ? currentNode
              : {
                  ...currentNode,
                  position: { x: pendingSnap.x, y: pendingSnap.y },
                },
          ),
        );
      }

      const currentNode = nodesRef.current.find((item) => item.id === node.id);
      const position = pendingSnap ?? currentNode?.position ?? node.position;

      if (node.type === "custom-entity") {
        onNodePositionCommit?.({ id: node.id, x: position.x, y: position.y });
      }

      window.setTimeout(() => {
        dragConsumedClickRef.current = false;
      }, 0);
    },
    [commitCanvasBlocks, onNodePositionCommit, scheduleGuideLines, setNodes],
  );

  const guideScreenX =
    guideLines.x === null ? null : guideLines.x * viewport.zoom + viewport.x;
  const guideScreenY =
    guideLines.y === null ? null : guideLines.y * viewport.zoom + viewport.y;

  return {
    edges,
    guideScreenX,
    guideScreenY,
    pointerPlacementRef,
    draggingNodeIdRef,
    handleNodesChange,
    handleEdgesChange,
    handleConnect,
    isValidConnection,
    onNodeClick,
    onMoveStart,
    onMoveEnd,
    onEdgeClick,
    onPaneClick,
    onPaneMouseMove,
    onNodesDelete,
    onEdgesDelete,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
  };
}
