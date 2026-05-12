import { useCallback, useState } from "react";
import { useReactFlow, type Node, type Edge, type Connection, addEdge } from "reactflow";
import type { WorldEntitySourceType } from "@shared/types";
import { CANVAS_NODE_DEFAULT_WIDTH, CANVAS_NODE_DEFAULT_HEIGHT } from "../shared/constants";

export function useCanvasInteractions(
  nodes: Node[],
  edges: Edge[],
  onNodesChange: (nodes: Node[]) => void,
  onEdgesChange: (edges: Edge[]) => void,
) {
  const { getViewport, fitView, zoomIn, zoomOut } = useReactFlow();
  const [isAutoLayoutRunning, setIsAutoLayoutRunning] = useState(false);

  const handleConnect = useCallback(
    (connection: Connection) => {
      onEdgesChange(addEdge({ ...connection, type: "canvasEdge" }, edges));
    },
    [edges, onEdgesChange],
  );

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.12, duration: 400 });
  }, [fitView]);

  const handleAutoLayout = useCallback(async () => {
    if (isAutoLayoutRunning || nodes.length === 0) return;
    setIsAutoLayoutRunning(true);

    const COLS = 4;
    const GAP_X = CANVAS_NODE_DEFAULT_WIDTH + 40;
    const GAP_Y = CANVAS_NODE_DEFAULT_HEIGHT + 40;
    const OFFSET_X = 60;
    const OFFSET_Y = 60;

    const updated = nodes.map((node, idx) => ({
      ...node,
      position: {
        x: OFFSET_X + (idx % COLS) * GAP_X,
        y: OFFSET_Y + Math.floor(idx / COLS) * GAP_Y,
      },
    }));

    onNodesChange(updated);
    setIsAutoLayoutRunning(false);
    setTimeout(() => fitView({ padding: 0.12, duration: 400 }), 50);
  }, [isAutoLayoutRunning, nodes, onNodesChange, fitView]);

  const buildEntityNode = useCallback(
    (entityType: WorldEntitySourceType, name: string, id: string, posX?: number, posY?: number): Node => {
      const viewport = getViewport();
      const x = posX ?? (-viewport.x / viewport.zoom + 200);
      const y = posY ?? (-viewport.y / viewport.zoom + 200);
      return {
        id,
        type: "entityNode",
        position: { x, y },
        data: { label: name, entityType },
      };
    },
    [getViewport],
  );

  const buildMemoNode = useCallback(
    (id: string, posX?: number, posY?: number): Node => {
      const viewport = getViewport();
      const x = posX ?? (-viewport.x / viewport.zoom + 200);
      const y = posY ?? (-viewport.y / viewport.zoom + 200);
      return {
        id,
        type: "memoNode",
        position: { x, y },
        data: { content: "" },
      };
    },
    [getViewport],
  );

  return {
    handleConnect,
    handleFitView,
    handleAutoLayout,
    isAutoLayoutRunning,
    buildEntityNode,
    buildMemoNode,
    zoomIn,
    zoomOut,
  };
}
