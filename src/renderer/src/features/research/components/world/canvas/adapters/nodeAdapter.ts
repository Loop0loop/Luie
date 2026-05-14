/**
 * worldBuildingStore의 도메인 데이터를 react-flow가 먹는 형태로 변환한다.
 *
 *   WorldGraphNode      → Node<CanvasNodeData>
 *   EntityRelation      → Edge
 *   ScrapMemo (note)    → Node<CanvasNodeData> (kind: "note")
 *
 * 어댑터는 순수 함수다. 부수효과 없이 입력만 받아 출력을 만든다.
 * 이렇게 두면 테스트하기 쉽고, 캔버스 stage가 도메인 모델에 직접 의존하지
 * 않는다 — 캔버스 입장에서 데이터는 항상 `Node[]` / `Edge[]`다.
 */

import type { Edge, Node } from "reactflow";
import type {
  EntityRelation,
  WorldGraphNode,
  WorldEntitySourceType,
} from "@shared/types";
import { ENTITY_TYPE_TO_CANVAS_KIND } from "../types";
import {
  CANVAS_NODE_TYPE,
  type CanvasNodeData,
} from "../stage/nodes";
import type { CanvasNodeFilterId } from "../types";

/** 캔버스 entity 타입을 필터 ID로 변환 (Filters 토글에 사용) */
function entityTypeToFilterId(
  entityType: WorldEntitySourceType,
): CanvasNodeFilterId {
  const kind = ENTITY_TYPE_TO_CANVAS_KIND[entityType];
  return kind;
}

/** 노드 부제 추출 — entityType 별 의미가 다름 */
function buildSubtitle(node: WorldGraphNode): string | undefined {
  if (node.firstAppearance) return node.firstAppearance;
  if (node.subType) return node.subType;
  return undefined;
}

interface ToCanvasNodesOptions {
  filters: Record<CanvasNodeFilterId, boolean>;
  selectedNodeId: string | null;
}

/**
 * WorldGraphNode 배열을 react-flow Node 배열로 변환.
 *
 * - filters 토글로 종류별 표시/숨김
 * - selectedNodeId가 있으면 해당 노드만 selected:true
 * - canonical/derived는 도메인에 origin 필드가 없으므로 일단 모두 canonical로 둔다
 *   (자동 추출 후보 모델이 들어오면 이 함수 분기 추가)
 */
export function toCanvasNodes(
  graphNodes: readonly WorldGraphNode[],
  options: ToCanvasNodesOptions,
): Node<CanvasNodeData>[] {
  const { filters, selectedNodeId } = options;

  return graphNodes
    .filter((node) => {
      const filterId = entityTypeToFilterId(node.entityType);
      return filters[filterId];
    })
    .map<Node<CanvasNodeData>>((node) => {
      const kind = ENTITY_TYPE_TO_CANVAS_KIND[node.entityType];
      return {
        id: node.id,
        type: CANVAS_NODE_TYPE[kind],
        position: { x: node.positionX, y: node.positionY },
        selected: node.id === selectedNodeId,
        data: {
          kind,
          origin: "canonical",
          title: node.name,
          subtitle: buildSubtitle(node),
        },
      };
    });
}

interface ToCanvasEdgesOptions {
  showRelations: boolean;
  selectedEdgeId: string | null;
  /** 표시 중인 노드 ID set — 양 끝이 모두 표시된 엣지만 그린다 */
  visibleNodeIds: ReadonlySet<string>;
}

/**
 * EntityRelation 배열을 react-flow Edge 배열로 변환.
 * filters.relation이 꺼져있으면 빈 배열을 반환.
 */
export function toCanvasEdges(
  relations: readonly EntityRelation[],
  options: ToCanvasEdgesOptions,
): Edge[] {
  const { showRelations, selectedEdgeId, visibleNodeIds } = options;
  if (!showRelations) return [];

  return relations
    .filter(
      (rel) =>
        visibleNodeIds.has(rel.sourceId) && visibleNodeIds.has(rel.targetId),
    )
    .map<Edge>((rel) => ({
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      label: rel.relation,
      selected: rel.id === selectedEdgeId,
      type: "smoothstep",
    }));
}
