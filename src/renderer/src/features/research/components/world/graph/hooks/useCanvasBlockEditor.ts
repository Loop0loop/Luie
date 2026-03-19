import { useCallback, useEffect, useRef, useState } from "react";
import type { Node, XYPosition } from "reactflow";
import type { WorldGraphCanvasBlock, WorldGraphNode } from "@shared/types";
import type {
  CanvasTimelineBlockData,
  TimelineSequenceNode,
} from "../components/CanvasTimelineBlockNode";
import type { CanvasMemoBlockData } from "../components/CanvasMemoBlockNode";
import {
  CANVAS_EDGE_COLORS,
  fromCanvasLocalNodes,
  generateLocalId,
  isCanvasLocalNodeType,
  syncCanvasLocalNodes,
  toCanvasBlockNodes,
  type AnyCanvasNodeData,
} from "../utils/canvasFlowUtils";

type UseCanvasBlockEditorInput = {
  graphNodes: Node<AnyCanvasNodeData>[];
  canvasBlocks: WorldGraphCanvasBlock[];
  timelineNodes: WorldGraphNode[];
  onCanvasBlocksCommit?: (blocks: WorldGraphCanvasBlock[]) => void;
  onSelectNode: (nodeId: string | null) => void;
  resolvePlacementPosition: () => XYPosition;
  draggingNodeIdRef: React.MutableRefObject<string | null>;
};

export function useCanvasBlockEditor({
  graphNodes,
  canvasBlocks,
  timelineNodes,
  onCanvasBlocksCommit,
  onSelectNode,
  resolvePlacementPosition,
  draggingNodeIdRef,
}: UseCanvasBlockEditorInput) {
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

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        const incoming = graphNodes.find((item) => item.id === node.id);
        return incoming ?? node;
      }),
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
  }, [
    canvasBlocks,
    commitCanvasBlocks,
    draggingNodeIdRef,
    handleCycleCanvasBlockColor,
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
