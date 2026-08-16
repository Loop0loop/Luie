import { useMemo } from "react";
import { MarkerType, type Node, type Edge } from "reactflow";
import type { GraphNodeData } from "../../../types/graph";
import { GRAPH_CONSTELLATION_EDGE_DEFAULTS } from "../../../constants/edge";

interface UseGraphDataFilteringParams {
  sourceNodes: Node<GraphNodeData>[];
  sourceEdges: Edge[];
  activeMode: "character" | "event";
  selectedFocusNode: string;
  focusId: string | null;
}

export function useGraphDataFiltering({
  sourceNodes,
  sourceEdges,
  activeMode,
  selectedFocusNode,
  focusId,
}: UseGraphDataFilteringParams) {
  return useMemo(() => {
    const computedEdges = sourceEdges.map((edge) => {
      const strength = edge.data?.strength ?? 1;
      const isCharacterMode = activeMode === "character";

      const cfg = isCharacterMode
        ? GRAPH_CONSTELLATION_EDGE_DEFAULTS.character
        : GRAPH_CONSTELLATION_EDGE_DEFAULTS.event;

      const edgeStyle: React.CSSProperties = {
        stroke: cfg.stroke,
        strokeWidth: strength * cfg.widthMultiplier,
        opacity: cfg.opacityBase + strength * cfg.opacityMultiplier,
      };

      if ("dasharray" in cfg) {
        edgeStyle.strokeDasharray = cfg.dasharray;
      }

      const labelStyle: React.CSSProperties = {
        fill: "var(--text-secondary)",
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "var(--font-sans, Inter, system-ui, sans-serif)",
        letterSpacing: "-0.01em",
      };

      const labelBgStyle: React.CSSProperties = {
        fill: "var(--bg-panel)",
        fillOpacity: 0.95,
        stroke: "var(--border-default)",
        strokeWidth: 1.2,
        rx: 6,
        ry: 6,
      };

      return {
        ...edge,
        type: "straight",
        label: edge.data?.label,
        labelStyle,
        labelBgStyle,
        labelBgPadding: [8, 4] as [number, number],
        animated: false,
        markerEnd: isCharacterMode
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: cfg.markerSize,
              height: cfg.markerSize,
              color: "currentColor",
            },
        style: edgeStyle,
      };
    });

    const computedNodes = sourceNodes.map((node): Node<GraphNodeData> => {
      const degree = computedEdges.filter(
        (edge) => edge.source === node.id || edge.target === node.id,
      ).length;
      const starGrade: "prime" | "major" | "minor" =
        degree >= 3 ? "prime" : degree >= 1 ? "major" : "minor";

      let filterFocusedOpacity = 1.0;
      if (selectedFocusNode !== "all") {
        if (node.id !== selectedFocusNode) {
          const isConnected = computedEdges.some(
            (e) =>
              (e.source === selectedFocusNode && e.target === node.id) ||
              (e.target === selectedFocusNode && e.source === node.id) ||
              node.id === selectedFocusNode,
          );
          filterFocusedOpacity = isConnected ? 0.95 : 0.15;
        }
      }

      let canvasFocusedOpacity = 1.0;
      let isInteractivePointerEvents = true;
      if (focusId) {
        if (node.id !== focusId) {
          const isNeighbor = computedEdges.some(
            (e) =>
              (e.source === focusId && e.target === node.id) ||
              (e.target === focusId && e.source === node.id),
          );
          canvasFocusedOpacity = isNeighbor ? 0.95 : 0.0;
          isInteractivePointerEvents = isNeighbor;
        }
      }

      return {
        ...node,
        data: {
          ...node.data,
          starGrade,
          opacity: filterFocusedOpacity * canvasFocusedOpacity,
          isInteractive: isInteractivePointerEvents,
          isFocused: false,
        },
      };
    });

    return {
      filteredNodes: computedNodes,
      filteredEdges: computedEdges,
    };
  }, [activeMode, selectedFocusNode, focusId, sourceNodes, sourceEdges]);
}
