import { useEffect } from "react";
import { type Node, type Edge } from "reactflow";
import type { GraphNodeData } from "../../../types/graph";
import {
  EDGE_FALLBACK_OPACITY,
  EDGE_FALLBACK_STROKE_WIDTH,
  EDGE_FOCUS_OPACITY,
} from "./constants";

interface UseFocusSyncParams {
  focusId: string | null;
  adjacency: Map<string, Set<string>>;
  /**
   * node/edge 구성이 바뀌면 layout effect가 focus가 반영되지 않은 node를 다시 넣는다.
   * 그때 focus 시각화를 다시 입히려면 이 값도 dependency여야 한다.
   */
  topologySignature: string;
  setNodes: (updater: (prev: Node<GraphNodeData>[]) => Node<GraphNodeData>[]) => void;
  setEdges: (updater: (prev: Edge[]) => Edge[]) => void;
}

export function useFocusSync({
  focusId,
  adjacency,
  topologySignature,
  setNodes,
  setEdges,
}: UseFocusSyncParams) {
  useEffect(() => {
    setNodes((prevNodes) => {
      const neighbours = focusId ? adjacency.get(focusId) : undefined;
      let changed = false;

      const nextNodes = prevNodes.map((node) => {
        const baseOpacity = node.data.baseOpacity ?? 1;
        const isFocused = node.id === focusId;
        const isNeighbour = isFocused || (neighbours?.has(node.id) ?? false);

        // NOTE: focus가 없으면 필터 드롭다운이 정한 기본 투명도로 되돌린다.
        const focusOpacity = !focusId ? 1 : isNeighbour ? 0.95 : 0;
        const opacity = baseOpacity * focusOpacity;
        const isInteractive = !focusId || isNeighbour;

        if (
          node.data.isFocused === isFocused &&
          node.data.opacity === opacity &&
          node.data.isInteractive === isInteractive
        ) {
          return node;
        }

        changed = true;
        return {
          ...node,
          data: { ...node.data, isFocused, opacity, isInteractive },
        };
      });

      return changed ? nextNodes : prevNodes;
    });

    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        if (!focusId) {
          return {
            ...edge,
            animated: edge.data?.animatedBackup ?? edge.animated,
            style: {
              ...edge.style,
              opacity: edge.data?.opacityBackup ?? edge.style?.opacity ?? EDGE_FALLBACK_OPACITY,
              strokeWidth:
                edge.data?.strokeWidthBackup ??
                edge.style?.strokeWidth ??
                EDGE_FALLBACK_STROKE_WIDTH,
              stroke: edge.data?.strokeBackup ?? edge.style?.stroke,
            },
            labelStyle: {
              ...edge.labelStyle,
              opacity: 1.0,
            },
            labelBgStyle: {
              ...edge.labelBgStyle,
              opacity: 1.0,
              stroke: edge.data?.labelBgStrokeBackup ?? edge.labelBgStyle?.stroke,
            },
          };
        }

        const isRelated = edge.source === focusId || edge.target === focusId;

        // NOTE: focus 해제 시 원래 style을 복구할 수 있도록 최초 값만 보존한다.
        const opacityBackup =
          edge.data?.opacityBackup ?? edge.style?.opacity ?? EDGE_FALLBACK_OPACITY;
        const strokeWidthBackup =
          edge.data?.strokeWidthBackup ??
          edge.style?.strokeWidth ??
          EDGE_FALLBACK_STROKE_WIDTH;
        const strokeBackup = edge.data?.strokeBackup ?? edge.style?.stroke ?? "currentColor";
        const animatedBackup = edge.data?.animatedBackup ?? edge.animated ?? false;
        const labelBgStrokeBackup =
          edge.data?.labelBgStrokeBackup ?? edge.labelBgStyle?.stroke;

        // NOTE: `--accent`는 정의된 token이 아니다. 그대로 두면 stroke가 계산 시점에
        // 무효가 되어 focus한 관계선이 기본 검정으로 그려진다.
        const relationColor = "var(--accent-bg)";

        const baseWidth =
          typeof strokeWidthBackup === "number"
            ? strokeWidthBackup
            : Number(strokeWidthBackup) || EDGE_FALLBACK_STROKE_WIDTH;

        return {
          ...edge,
          data: {
            ...edge.data,
            opacityBackup,
            strokeWidthBackup,
            strokeBackup,
            animatedBackup,
            labelBgStrokeBackup,
          },
          animated: false,
          style: {
            ...edge.style,
            opacity: isRelated ? EDGE_FOCUS_OPACITY : 0,
            strokeWidth: isRelated ? baseWidth + 1.2 : baseWidth,
            stroke: isRelated ? relationColor : strokeBackup,
            pointerEvents: isRelated ? "auto" : "none", // 비관련 에지 이벤트 완전 차단
          },
          labelStyle: {
            ...edge.labelStyle,
            opacity: isRelated ? 1.0 : 0,
          },
          labelBgStyle: {
            ...edge.labelBgStyle,
            opacity: isRelated ? 1.0 : 0,
            stroke: isRelated ? relationColor : labelBgStrokeBackup,
          },
        };
      }),
    );
  }, [adjacency, focusId, setEdges, setNodes, topologySignature]);
}
