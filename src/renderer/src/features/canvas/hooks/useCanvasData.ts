/**
 * 캔버스가 사용하는 모든 데이터 소스를 한곳에서 모아 react-flow가
 * 먹는 형태로 변환해 돌려준다.
 *
 *   worldBuildingStore  → 그래프 노드 / 엣지
 *   canvasUiStore       → 필터 / 선택 / 레이어
 *   projectStore        → 현재 프로젝트
 *
 * 이 hook은 캔버스의 외부 의존성 진입점이다. 컴포넌트(Stage, Outline,
 * Inspector)는 이 hook의 결과만 본다.
 */

import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Edge, Node } from "reactflow";
import type { WorldGraphNode } from "@shared/types";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { toCanvasEdges, toCanvasNodes } from "../adapters/nodeAdapter";
import { useCanvasUiStore } from "../store/canvasUiStore";
import type { CanvasNodeData } from "../stage/nodes";

interface CanvasData {
  /** 현재 프로젝트 ID. 없으면 캔버스는 빈 상태. */
  projectId: string | null;
  /** react-flow에 그대로 넣을 노드 배열 */
  nodes: Node<CanvasNodeData>[];
  /** react-flow에 그대로 넣을 엣지 배열 */
  edges: Edge[];
  /** 원본 도메인 노드 — Outline / Inspector에서 사용 */
  graphNodes: readonly WorldGraphNode[];
  /** 그래프 로딩 중 여부 */
  isLoading: boolean;
  /** 로드 실패 메시지 */
  error: string | null;
}

export function useCanvasData(): CanvasData {
  const projectId = useProjectStore((s) => s.currentProject?.id ?? null);

  const { graphData, isLoading, error, loadGraph } = useWorldBuildingStore(
    useShallow((s) => ({
      graphData: s.graphData,
      isLoading: s.isLoading,
      error: s.error,
      loadGraph: s.loadGraph,
    })),
  );

  // 프로젝트가 바뀌면 그래프 재로딩
  useEffect(() => {
    if (projectId) {
      void loadGraph(projectId);
    }
  }, [projectId, loadGraph]);

  const filters = useCanvasUiStore((s) => s.filters);
  const selection = useCanvasUiStore((s) => s.selection);

  const selectedNodeId = selection.kind === "node" ? selection.id : null;
  const selectedEdgeId = selection.kind === "edge" ? selection.id : null;

  const graphNodes = graphData?.nodes ?? [];
  const relations = graphData?.edges ?? [];

  const nodes = useMemo(
    () =>
      toCanvasNodes(graphNodes, {
        filters,
        selectedNodeId,
      }),
    [graphNodes, filters, selectedNodeId],
  );

  const edges = useMemo(() => {
    const visibleNodeIds = new Set(nodes.map((n) => n.id));
    return toCanvasEdges(relations, {
      showRelations: filters.relation,
      selectedEdgeId,
      visibleNodeIds,
    });
  }, [nodes, relations, filters.relation, selectedEdgeId]);

  return {
    projectId,
    nodes,
    edges,
    graphNodes,
    isLoading,
    error,
  };
}
