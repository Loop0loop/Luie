import type { Connection } from "reactflow";
import type { WorldGraphData, WorldGraphNode } from "@shared/types";

export type RelationConnectionRejection =
  | "incomplete"
  | "self-loop"
  | "unknown-node"
  | "duplicate";

export type RelationConnectionResult =
  | { ok: true; source: WorldGraphNode; target: WorldGraphNode }
  | { ok: false; reason: RelationConnectionRejection };

/**
 * canvas에서 node handle을 이어붙일 때 실제로 관계를 만들어도 되는지 판정한다.
 *
 * reactflow는 handle 짝만 맞으면 연결을 허용하므로 자기 자신 연결과 이미 존재하는
 * 쌍을 여기서 걸러야 한다. 걸러지지 않으면 DB에 중복 행이 쌓이고 캔버스에는 노드
 * 뒤에 숨어 선택할 수 없는 엣지가 남는다.
 */
export function resolveRelationConnection(
  connection: Connection,
  graphData: WorldGraphData | null,
): RelationConnectionResult {
  const { source, target } = connection;
  if (!source || !target) return { ok: false, reason: "incomplete" };
  if (source === target) return { ok: false, reason: "self-loop" };

  const nodes = graphData?.nodes ?? [];
  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);
  if (!sourceNode || !targetNode) return { ok: false, reason: "unknown-node" };

  // NOTE: 방향이 반대인 기존 관계도 같은 연결로 본다. 캔버스에서는 두 엣지가 겹쳐
  // 보이므로 사용자가 중복을 구분할 수 없다.
  const isDuplicate = (graphData?.edges ?? []).some(
    (edge) =>
      (edge.sourceId === source && edge.targetId === target) ||
      (edge.sourceId === target && edge.targetId === source),
  );
  if (isDuplicate) return { ok: false, reason: "duplicate" };

  return { ok: true, source: sourceNode, target: targetNode };
}
