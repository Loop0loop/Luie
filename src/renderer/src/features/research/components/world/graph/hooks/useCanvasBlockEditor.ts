import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Node, XYPosition } from "reactflow";
import type {
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphNode,
} from "@shared/types";
import type { CanvasTimelineBlockData } from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import {
  fromCanvasLocalNodes,
  generateLocalId,
  isCanvasLocalNodeType,
  mergeIncomingNodes,
  syncCanvasLocalNodes,
  toCanvasBlockNodes,
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";
import { GRAPH_CANVAS_DEFAULT_EDGE_COLORS } from "../shared";

type UseCanvasBlockEditorInput = {
  graphNodes: Node<CanvasGraphNodeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  canvasEdges: WorldGraphCanvasEdge[];
  timelineNodes: WorldGraphNode[];
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onCanvasEdgesCommit?: (edges: WorldGraphCanvasEdge[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  resolvePlacementPosition: () => XYPosition;
  draggingNodeIdRef: React.MutableRefObject<string | null>;
  onAddTimelineBranch?: (
    sourceNodeId: string,
    direction: "up" | "down" | "left" | "right",
  ) => void;
};

export function useCanvasBlockEditor({
  graphNodes,
  canvasBlocks,
  canvasEdges,
  timelineNodes,
  onCanvasBlocksCommit,
  onCanvasEdgesCommit,
  onSelectNode,
  resolvePlacementPosition,
  draggingNodeIdRef,
  onAddTimelineBranch,
}: UseCanvasBlockEditorInput) {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<Node<AnyCanvasNodeData>[]>(graphNodes);
  const historyRef = useRef<Node<AnyCanvasNodeData>[][]>([]);
  const historyIndexRef = useRef(-1);
  const pendingCanvasBlocksCommitRef = useRef<
    Node<AnyCanvasNodeData>[] | null
  >(null);
  const canvasBlocksCommitTimerRef = useRef<number | null>(null);

  const commitCanvasBlocks = useCallback(
    (snapshot: Node<AnyCanvasNodeData>[]) => {
      pendingCanvasBlocksCommitRef.current = null;
      if (canvasBlocksCommitTimerRef.current !== null) {
        clearTimeout(canvasBlocksCommitTimerRef.current);
        canvasBlocksCommitTimerRef.current = null;
      }
      onCanvasBlocksCommit?.(fromCanvasLocalNodes(snapshot));
    },
    [onCanvasBlocksCommit],
  );

  const flushPendingCanvasBlocksCommit = useCallback(() => {
    const pending = pendingCanvasBlocksCommitRef.current;
    pendingCanvasBlocksCommitRef.current = null;
    if (canvasBlocksCommitTimerRef.current !== null) {
      clearTimeout(canvasBlocksCommitTimerRef.current);
      canvasBlocksCommitTimerRef.current = null;
    }
    if (!pending) {
      return;
    }
    commitCanvasBlocks(pending);
  }, [commitCanvasBlocks]);

  const scheduleCanvasBlocksCommit = useCallback(
    (snapshot: Node<AnyCanvasNodeData>[]) => {
      pendingCanvasBlocksCommitRef.current = snapshot;
      if (canvasBlocksCommitTimerRef.current !== null) {
        return;
      }

      canvasBlocksCommitTimerRef.current = window.setTimeout(() => {
        canvasBlocksCommitTimerRef.current = null;
        flushPendingCanvasBlocksCommit();
      }, 120);
    },
    [flushPendingCanvasBlocksCommit],
  );

  const commitCanvasEdges = useCallback(
    (snapshot: WorldGraphCanvasEdge[]) => {
      onCanvasEdgesCommit?.(snapshot);
    },
    [onCanvasEdgesCommit],
  );

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
          const current = color ?? GRAPH_CANVAS_DEFAULT_EDGE_COLORS[0];
          const index = GRAPH_CANVAS_DEFAULT_EDGE_COLORS.indexOf(
            current as (typeof GRAPH_CANVAS_DEFAULT_EDGE_COLORS)[number],
          );
          const nextColor =
            GRAPH_CANVAS_DEFAULT_EDGE_COLORS[
              (Math.max(0, index) + 1) % GRAPH_CANVAS_DEFAULT_EDGE_COLORS.length
            ];

          return {
            ...node,
            data: {
              ...node.data,
              color: nextColor,
            },
          };
        });

        scheduleCanvasBlocksCommit(next);
        return next;
      });
    },
    [scheduleCanvasBlocksCommit],
  );

  const handleDeleteLocalNode = useCallback(
    (id: string) => {
      setNodes((current) => {
        const next = current.filter((node) => node.id !== id);
        commitCanvasBlocks(next);
        const nextEdges = canvasEdges.filter(
          (edge) => edge.sourceId !== id && edge.targetId !== id,
        );
        if (nextEdges.length !== canvasEdges.length) {
          commitCanvasEdges(nextEdges);
        }
        return next;
      });
      onSelectNode(null);
    },
    [canvasEdges, commitCanvasBlocks, commitCanvasEdges, onSelectNode],
  );

  const handleMemoDataChange = useCallback(
    (
      id: string,
      patch: Partial<Omit<CanvasMemoBlockData, "onDelete" | "onDataChange">>,
    ) => {
      setNodes((current) => {
        const next = current.map((node) => {
          if (node.id !== id || node.type !== "canvas-memo") return node;
          return {
            ...node,
            data: { ...(node.data as CanvasMemoBlockData), ...patch },
          };
        });
        scheduleCanvasBlocksCommit(next);
        return next;
      });
    },
    [scheduleCanvasBlocksCommit],
  );

  const handleUpdateTimelineMeta = useCallback(
    (
      nodeId: string,
      patch: Partial<
        Omit<
          CanvasTimelineBlockData,
          "onChangeColor" | "onDataChange" | "onDelete"
        >
      >,
    ) => {
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

        scheduleCanvasBlocksCommit(next);
        return next;
      });
    },
    [scheduleCanvasBlocksCommit],
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

  const handlePickTimelineEvent = useCallback(
    (nodeId: string) => {
      const source = timelineNodes.find((node) => node.id === nodeId);
      if (!source) return;
      const position = resolvePlacementPosition();
      const id = generateLocalId("timeline");

      const newNode: Node<CanvasTimelineBlockData> = {
        id,
        type: "canvas-timeline",
        position,
        draggable: true,
        data: {
          content: source.name,
          isHeld: false,
          color: GRAPH_CANVAS_DEFAULT_EDGE_COLORS[0],
          onDataChange: handleUpdateTimelineMeta,
          onChangeColor: handleCycleCanvasBlockColor,
          onDelete: handleDeleteLocalNode,
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
      onSelectNode,
      commitCanvasBlocks,
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
        content: t("research.graph.nodeDefaults.timelineBlock"),
        isHeld: false,
        color: GRAPH_CANVAS_DEFAULT_EDGE_COLORS[0],
        onDataChange: handleUpdateTimelineMeta,
        onChangeColor: handleCycleCanvasBlockColor,
        onDelete: handleDeleteLocalNode,
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
    pushHistory,
    resolvePlacementPosition,
    t,
  ]);

  useEffect(() => {
    setNodes((currentNodes) => {
      const graphOnlyCurrent = currentNodes.filter(
        (node) => !isCanvasLocalNodeType(node.type),
      );
      const localNodes = currentNodes.filter((node) =>
        isCanvasLocalNodeType(node.type),
      );

      const mergedGraphNodes = mergeIncomingNodes(
        graphOnlyCurrent as Node<CanvasGraphNodeData>[],
        graphNodes,
        draggingNodeIdRef.current,
      );

      return [...mergedGraphNodes, ...localNodes];
    });
  }, [graphNodes, draggingNodeIdRef]);

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
            scheduleCanvasBlocksCommit(next);
            return next;
          });
        },
        onTimelineChange: (id, patch) => {
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
            scheduleCanvasBlocksCommit(next);
            return next;
          });
        },
        onBlockColorChange: handleCycleCanvasBlockColor,
        onAddBranch: onAddTimelineBranch,
      });

      return syncCanvasLocalNodes(
        currentNodes,
        incomingCanvasNodes,
        draggingNodeIdRef.current,
      );
    });
  }, [
    canvasBlocks,
    commitCanvasBlocks,
    draggingNodeIdRef,
    handleCycleCanvasBlockColor,
    onAddTimelineBranch,
    scheduleCanvasBlocksCommit,
  ]);

  useEffect(
    () => () => {
      flushPendingCanvasBlocksCommit();
    },
    [flushPendingCanvasBlocksCommit],
  );

  return {
    nodes,
    setNodes,
    commitCanvasBlocks,
    handleUndo,
    handleRedo,
    handleCreateMemo,
    handleCreateTimelineBlock,
    handlePickTimelineEvent,
  };
}
