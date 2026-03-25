import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type ReactFlowInstance,
} from "reactflow";
import { api } from "@shared/api";
import type { WorldGraphCanvasBlock, WorldGraphCanvasEdge } from "@shared/types";
import type { CanvasGraphEdgeData } from "../components/CanvasGraphEdge";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import {
  decorateEdges,
  findBestAxisGuide,
  getNodeDimensions,
  isCanvasLocalNodeType,
  isTimelineInternalHandle,
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";
import {
  GRAPH_AUTO_LAYOUT_FIT_VIEW_DELAY_MS,
  GRAPH_DEFAULT_NODE_COLUMNS,
  GRAPH_DEFAULT_NODE_COLUMN_GAP_PX,
  GRAPH_DEFAULT_NODE_OFFSET_X_PX,
  GRAPH_DEFAULT_NODE_OFFSET_Y_PX,
  GRAPH_DEFAULT_NODE_ROW_GAP_PX,
  GRAPH_EDGE_ZOOM_FIT_PADDING,
  GRAPH_EDGE_ZOOM_MIN_BOUNDS,
  GRAPH_FIT_VIEW_DURATION_AUTO_LAYOUT_MS,
  GRAPH_FIT_VIEW_DURATION_SHORT_MS,
  GRAPH_FIT_VIEW_PADDING_AUTO_LAYOUT,
  GRAPH_FIT_VIEW_PADDING_DEFAULT,
} from "../shared/layout/graphLayoutConstants";
import { GRAPH_ENTITY_CANVAS_THEME_TOKENS } from "../shared/theme/graphThemeConstants";
import { GRAPH_PERF_SCOPE } from "../shared/instrumentation/graphPerfConstants";
import {
  startGraphPerfTimer,
  trackGraphPerfDuration,
} from "../shared/instrumentation/graphPerfMetrics";

type UseCanvasFlowInteractionsInput = {
  graphNodes: Node<CanvasGraphNodeData>[];
  graphEdges: Edge<CanvasGraphEdgeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  canvasEdges: WorldGraphCanvasEdge[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  nodes: Node<AnyCanvasNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<AnyCanvasNodeData>[]>>;
  commitCanvasBlocks: (snapshot: Node<AnyCanvasNodeData>[]) => void;
  commitCanvasEdges?: (snapshot: WorldGraphCanvasEdge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionCommit?: (input: { id: string; x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void | Promise<void>;
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
  canvasEdges,
  selectedNodeId,
  autoLayoutTrigger,
  nodes,
  setNodes,
  commitCanvasBlocks,
  commitCanvasEdges,
  onSelectNode,
  onNodePositionCommit,
  onDeleteNode,
  onConnectNodes,
  onAutoLayoutApplied,
  reactFlow,
}: UseCanvasFlowInteractionsInput) {
  const [pendingEdges, setPendingEdges] = useState<Edge<CanvasGraphEdgeData>[]>(
    [],
  );
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
  const lastFrameSampleAtRef = useRef<number>(0);
  const dragStartedAtRef = useRef<Map<string, number>>(new Map());
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
          width: Math.max(GRAPH_EDGE_ZOOM_MIN_BOUNDS.width, maxX - minX),
          height: Math.max(GRAPH_EDGE_ZOOM_MIN_BOUNDS.height, maxY - minY),
        },
        {
          padding: GRAPH_EDGE_ZOOM_FIT_PADDING,
          duration: GRAPH_FIT_VIEW_DURATION_SHORT_MS,
        },
      );
    },
    [reactFlow],
  );

  const buildDecoratedEdges = useCallback(
    (edgeList: Edge<CanvasGraphEdgeData>[], selectedId: string | null) =>
      decorateEdges(
        edgeList.map((edge) => {
          const palette = edge.data?.palette ?? {
            stroke: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.edge,
            selectedStroke:
              GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.selectedEdge,
            glow: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.glow,
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
        selectedId,
      ),
    [handleZoomEdgeInSurface],
  );

  const effectiveSelectedEdgeId = selectedNodeId ? null : selectedEdgeId;

  const edges = useMemo(
    () =>
      buildDecoratedEdges(
        [...graphEdges, ...pendingEdges],
        effectiveSelectedEdgeId,
      ),
    [buildDecoratedEdges, effectiveSelectedEdgeId, graphEdges, pendingEdges],
  );

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

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
    if (autoLayoutTrigger === 0) return;
    if (autoLayoutTrigger === appliedAutoLayoutTriggerRef.current) return;

    appliedAutoLayoutTriggerRef.current = autoLayoutTrigger;
    const COLS = GRAPH_DEFAULT_NODE_COLUMNS;
    const COL_GAP = GRAPH_DEFAULT_NODE_COLUMN_GAP_PX;
    const ROW_GAP = GRAPH_DEFAULT_NODE_ROW_GAP_PX;
    const OFFSET_X = GRAPH_DEFAULT_NODE_OFFSET_X_PX;
    const OFFSET_Y = GRAPH_DEFAULT_NODE_OFFSET_Y_PX;
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
      void reactFlow.fitView({
        padding: GRAPH_FIT_VIEW_PADDING_AUTO_LAYOUT,
        duration: GRAPH_FIT_VIEW_DURATION_AUTO_LAYOUT_MS,
      });
    }, GRAPH_AUTO_LAYOUT_FIT_VIEW_DELAY_MS);
  }, [autoLayoutTrigger, onAutoLayoutApplied, reactFlow, setNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
    },
    [setNodes],
  );

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    const selectedChange = [...changes]
      .reverse()
      .find((change) => change.type === "select");
    if (selectedChange?.type === "select") {
      setSelectedEdgeId(selectedChange.selected ? selectedChange.id : null);
    }

    const removedEdgeIds = new Set(
      changes
        .filter(
          (change): change is EdgeChange & { type: "remove" } =>
            change.type === "remove",
        )
        .map((change) => change.id),
    );
    if (removedEdgeIds.size > 0) {
      setPendingEdges((currentEdges) =>
        currentEdges.filter((edge) => !removedEdgeIds.has(edge.id)),
      );
    }
  }, []);

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
            stroke: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.edge,
            selectedStroke:
              GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.selectedEdge,
            glow: GRAPH_ENTITY_CANVAS_THEME_TOKENS.WorldEntity.glow,
          },
          onDelete: () => {},
        },
      };

      setPendingEdges((currentEdges) => [...currentEdges, tempEdge]);

      // Async save - will replace temp edge with real edge via useEffect
      const edgeCreateTimer = startGraphPerfTimer({
        scope: GRAPH_PERF_SCOPE.canvasFlow,
        metric: "edge.create.latency",
        meta: {
          sourceId: connection.source,
          targetId: connection.target,
        },
      });

      void onConnectNodes({
        sourceId: connection.source,
        targetId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      })
        .then(() => {
          edgeCreateTimer.complete();
        })
        .catch((error) => {
          edgeCreateTimer.fail(error);
        })
        .finally(() => {
          setPendingEdges((currentEdges) =>
            currentEdges.filter((edge) => edge.id !== tempEdgeId),
          );
        });
    },
    [onConnectNodes],
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return false;
      if (connection.source === connection.target) return false;
      if (
        connection.sourceHandle &&
        !(
          connection.sourceHandle.endsWith("-source") ||
          connection.sourceHandle.endsWith("-out")
        )
      ) {
        return false;
      }
      if (
        connection.targetHandle &&
        !(
          connection.targetHandle.endsWith("-target") ||
          connection.targetHandle.endsWith("-in")
        )
      ) {
        return false;
      }

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
  }, [reactFlow]);

  const isTypingTarget = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    );
  }, []);

  const handleResetView = useCallback(() => {
    void reactFlow.fitView({
      padding: GRAPH_FIT_VIEW_PADDING_DEFAULT,
      duration: GRAPH_FIT_VIEW_DURATION_SHORT_MS,
    });
  }, [reactFlow]);

  const handleZoomInShortcut = useCallback(() => {
    void reactFlow.zoomIn({ duration: GRAPH_FIT_VIEW_DURATION_SHORT_MS });
  }, [reactFlow]);

  const handleZoomOutShortcut = useCallback(() => {
    void reactFlow.zoomOut({ duration: GRAPH_FIT_VIEW_DURATION_SHORT_MS });
  }, [reactFlow]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "0") {
        event.preventDefault();
        handleResetView();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "=") {
        event.preventDefault();
        handleZoomInShortcut();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "-") {
        event.preventDefault();
        handleZoomOutShortcut();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    handleResetView,
    handleZoomInShortcut,
    handleZoomOutShortcut,
    isTypingTarget,
  ]);

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

  const onPaneMouseMove = useCallback((event: ReactMouseEvent) => {
    pointerPlacementRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onNodesDelete = useCallback(
    async (deletedNodes: Node<AnyCanvasNodeData>[]) => {
      const deletedIds = new Set(deletedNodes.map((node) => node.id));

      for (const node of deletedNodes) {
        if (node.type !== "custom-entity") {
          continue;
        }
        await onDeleteNode?.(node.id);
      }

      const hasLocalCanvasNode = deletedNodes.some((node) =>
        isCanvasLocalNodeType(node.type),
      );
      if (hasLocalCanvasNode) {
        setNodes((currentNodes) => {
          const next = currentNodes.filter((node) => !deletedIds.has(node.id));
          commitCanvasBlocks(next);
          if (commitCanvasEdges) {
            const nextEdges = canvasEdges.filter(
              (edge) =>
                !deletedIds.has(edge.sourceId) &&
                !deletedIds.has(edge.targetId),
            );
            commitCanvasEdges(nextEdges);
          }
          return next;
        });
        onSelectNode(null);
      }

      setSelectedEdgeId(null);
    },
    [
      canvasEdges,
      commitCanvasBlocks,
      commitCanvasEdges,
      onDeleteNode,
      onSelectNode,
      setNodes,
    ],
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
      const now = performance.now();
      dragStartedAtRef.current.set(node.id, now);
      lastFrameSampleAtRef.current = now;
      dragConsumedClickRef.current = false;
      pendingSnapRef.current = null;
      onSelectNode(null);
    },
    [onSelectNode],
  );

  const onNodeDrag = useCallback(
    (_event: unknown, node: Node<AnyCanvasNodeData>) => {
      const now = performance.now();
      if (now - lastFrameSampleAtRef.current >= 200) {
        const frameDuration = now - lastFrameSampleAtRef.current;
        if (lastFrameSampleAtRef.current !== 0) {
          trackGraphPerfDuration({
            scope: GRAPH_PERF_SCOPE.canvasFlow,
            metric: "frame.time",
            durationMs: Number(frameDuration.toFixed(1)),
            status: "ok",
          });
        }
      }
      lastFrameSampleAtRef.current = now;

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

      const dragStartAt = dragStartedAtRef.current.get(node.id);
      dragStartedAtRef.current.delete(node.id);
      if (typeof dragStartAt === "number") {
        trackGraphPerfDuration({
          scope: GRAPH_PERF_SCOPE.canvasFlow,
          metric: "drag.latency",
          durationMs: Number((performance.now() - dragStartAt).toFixed(1)),
          status: "ok",
          meta: {
            nodeType: node.type,
          },
        });
      }

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
