import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type { Node, XYPosition } from "reactflow";
import type { WorldGraphCanvasBlock, WorldGraphNode } from "@shared/types";
import type { CanvasTimelineBlockData } from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import type { CanvasGraphNodeData } from "../components/CanvasGraphNodeCard";
import {
  CANVAS_EDGE_COLORS,
  fromCanvasLocalNodes,
  generateLocalId,
  isCanvasLocalNodeType,
  mergeIncomingNodes,
  syncCanvasLocalNodes,
  toCanvasBlockNodes,
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";

type UseCanvasBlockEditorInput = {
  graphNodes: Node<CanvasGraphNodeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  timelineNodes: WorldGraphNode[];
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  resolvePlacementPosition: () => XYPosition;
  draggingNodeIdRef: React.MutableRefObject<string | null>;
  onAddTimelineBranch?: (sourceNodeId: string) => void;
};

export function useCanvasBlockEditor({
  graphNodes,
  canvasBlocks,
  timelineNodes,
  onCanvasBlocksCommit,
  onSelectNode,
  resolvePlacementPosition,
  draggingNodeIdRef,
  onAddTimelineBranch,
}: UseCanvasBlockEditorInput) {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<Node<AnyCanvasNodeData>[]>(graphNodes);
  const historyRef = useRef<Node<AnyCanvasNodeData>[][]>([]);
  const historyIndexRef = useRef(-1);

  const commitCanvasBlocks = useCallback(
    (snapshot: Node<AnyCanvasNodeData>[]) => {
      onCanvasBlocksCommit?.(fromCanvasLocalNodes(snapshot));
    },
    [onCanvasBlocksCommit],
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

  const handleDeleteLocalNode = useCallback(
    (id: string) => {
      setNodes((current) => {
        const next = current.filter((node) => node.id !== id);
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
        const next = current.map((node) => {
          if (node.id !== id || node.type !== "canvas-memo") return node;
          return {
            ...node,
            data: { ...(node.data as CanvasMemoBlockData), ...patch },
          };
        });
        commitCanvasBlocks(next);
        return next;
      });
    },
    [commitCanvasBlocks],
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
          color: CANVAS_EDGE_COLORS[0],
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
        color: CANVAS_EDGE_COLORS[0],
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
    const timer = window.setTimeout(() => {
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
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [graphNodes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
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
              commitCanvasBlocks(next);
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
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    canvasBlocks,
    commitCanvasBlocks,
    draggingNodeIdRef,
    handleCycleCanvasBlockColor,
    onAddTimelineBranch,
  ]);

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
