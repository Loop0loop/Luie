import { useMemo } from "react";
import { MarkerType, type Node, type Edge } from "reactflow";
import type { GraphNodeData } from "../../../types/graph";
import { GRAPH_CONSTELLATION_EDGE_DEFAULTS } from "../../../constants/edge";

interface UseGraphDataFilteringParams {
  sourceNodes: Node<GraphNodeData>[];
  sourceEdges: Edge[];
  activeMode: "character" | "event";
  selectedFocusNode: string;
}

export interface GraphDataFilteringResult {
  filteredNodes: Node<GraphNodeData>[];
  filteredEdges: Edge[];
  /** node id -> 직접 연결된 node id 집합. focus 시각화가 O(1)로 이웃을 판정한다. */
  adjacency: Map<string, Set<string>>;
  /** node/edge 구성이 바뀌었는지만 식별한다. force layout 재계산 트리거로 쓴다. */
  topologySignature: string;
}

/**
 * canvas focus(`focusId`)는 여기서 다루지 않는다. focus를 이 memo에 넣으면 노드를 클릭할
 * 때마다 filteredNodes/filteredEdges identity가 바뀌어 GraphSurface의 force layout이
 * 전부 다시 돌았다. focus 시각화는 `useFocusSync`가 담당한다.
 */
export function useGraphDataFiltering({
  sourceNodes,
  sourceEdges,
  activeMode,
  selectedFocusNode,
}: UseGraphDataFilteringParams): GraphDataFilteringResult {
  const { filteredEdges, adjacency } = useMemo(() => {
    const isCharacterMode = activeMode === "character";
    const cfg = isCharacterMode
      ? GRAPH_CONSTELLATION_EDGE_DEFAULTS.character
      : GRAPH_CONSTELLATION_EDGE_DEFAULTS.event;

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

    const markerEnd = isCharacterMode
      ? undefined
      : {
          type: MarkerType.ArrowClosed,
          width: cfg.markerSize,
          height: cfg.markerSize,
          color: "currentColor",
        };

    const neighbours = new Map<string, Set<string>>();
    const link = (from: string, to: string) => {
      const bucket = neighbours.get(from);
      if (bucket) {
        bucket.add(to);
        return;
      }
      neighbours.set(from, new Set([to]));
    };

    const edges = sourceEdges.map((edge) => {
      link(edge.source, edge.target);
      link(edge.target, edge.source);

      const strength = edge.data?.strength ?? 1;
      const edgeStyle: React.CSSProperties = {
        stroke: cfg.stroke,
        strokeWidth: strength * cfg.widthMultiplier,
        opacity: cfg.opacityBase + strength * cfg.opacityMultiplier,
      };

      if ("dasharray" in cfg) {
        edgeStyle.strokeDasharray = cfg.dasharray;
      }

      return {
        ...edge,
        type: "straight",
        label: edge.data?.label,
        labelStyle,
        labelBgStyle,
        labelBgPadding: [8, 4] as [number, number],
        animated: false,
        markerEnd,
        style: edgeStyle,
      };
    });

    return { filteredEdges: edges, adjacency: neighbours };
  }, [activeMode, sourceEdges]);

  const filteredNodes = useMemo(
    () =>
      sourceNodes.map((node): Node<GraphNodeData> => {
        const degree = adjacency.get(node.id)?.size ?? 0;
        const starGrade: "prime" | "major" | "minor" =
          degree >= 3 ? "prime" : degree >= 1 ? "major" : "minor";

        // NOTE: 필터 드롭다운(selectedFocusNode)이 만드는 기본 투명도. canvas focus는
        // useFocusSync가 이 값에 곱한다.
        let baseOpacity = 1.0;
        if (selectedFocusNode !== "all" && node.id !== selectedFocusNode) {
          baseOpacity = adjacency.get(selectedFocusNode)?.has(node.id) ? 0.95 : 0.15;
        }

        return {
          ...node,
          data: {
            ...node.data,
            starGrade,
            baseOpacity,
            opacity: baseOpacity,
            isInteractive: true,
            isFocused: false,
          },
        };
      }),
    [adjacency, selectedFocusNode, sourceNodes],
  );

  const topologySignature = useMemo(() => {
    const nodePart = filteredNodes.map((node) => node.id).join(",");
    const edgePart = filteredEdges.map((edge) => edge.id).join(",");
    return `${activeMode}|${nodePart}|${edgePart}`;
  }, [activeMode, filteredEdges, filteredNodes]);

  return { filteredNodes, filteredEdges, adjacency, topologySignature };
}
