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
    // 1. 노드 포커스 갱신
    setNodes((prevNodes) =>
      prevNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isFocused: node.id === focusId,
        },
      })),
    );

    // 2. 에지 포커스 및 네온 라이팅 효과 동기화
    setEdges((prevEdges) =>
      prevEdges.map((edge) => {
        if (!focusId) {
          // 포커스가 해제된 경우: 원래 스타일 복원
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

        // 특정 노드가 포커스된 경우
        const isRelated = edge.source === focusId || edge.target === focusId;

        // 백업 상태 저장 (최초 1회)
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

        // strokeWidthBackup이 숫자형인지 강제 안전 변환 및 NaN 방지 고도화
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
          // 평형 다이어그램: 에지 애니메이션 미사용
          animated: false,
          style: {
            ...edge.style,
            // 관련 에지는 선명하게, 관련 없는 에지는 시야에서 전면 투명 소거
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
