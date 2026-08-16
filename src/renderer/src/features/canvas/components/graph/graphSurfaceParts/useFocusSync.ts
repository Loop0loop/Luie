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
  setNodes: (updater: (prev: Node<GraphNodeData>[]) => Node<GraphNodeData>[]) => void;
  setEdges: (updater: (prev: Edge[]) => Edge[]) => void;
}

export function useFocusSync({ focusId, setNodes, setEdges }: UseFocusSyncParams) {
  useEffect(() => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isFocused: node.id === focusId,
        },
      })),
    );

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

        const relationColor = "var(--accent)";

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
  }, [focusId, setNodes, setEdges]);
}
