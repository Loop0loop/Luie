import type { Node, Edge } from "reactflow";
import type { GraphNodeData } from "../types/graph";

/**
 * calculateForceLayout — D3 의존성 없이 순수 TS로 계산하는 간단한 Force-directed layout.
 *
 * SRP:
 *   - Attraction (연결선 간 인력), Repulsion (노드 간 반발력), Gravity (중앙 중심력) 연산.
 *   - Cooling factor를 사용하여 연산을 서서히 안정 상태로 수렴시킵니다.
 */
export function calculateForceLayout(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  iterations = 70,
  center = { x: 300, y: 300 }
): Node<GraphNodeData>[] {
  if (nodes.length === 0) return [];

  // 1. 복사본 생성 및 무작위 초기값 지정 (위치가 정의되지 않았을 경우)
  const layoutNodes = nodes.map((node) => ({
    ...node,
    position: {
      x: node.position?.x ?? (center.x + (Math.random() - 0.5) * 120),
      y: node.position?.y ?? (center.y + (Math.random() - 0.5) * 120),
    },
  }));

  const k = 130; // 노드 간 적정 거리 기준 파라미터
  let cooling = 1.0;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = layoutNodes.map(() => ({ x: 0, y: 0 }));

    // A. 반발력 (Repulsion) 계산: 모든 노드 쌍 사이에 작용하는 밀어내는 힘
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = 0; j < layoutNodes.length; j++) {
        if (i === j) continue;
        const dx = layoutNodes[i].position.x - layoutNodes[j].position.x;
        const dy = layoutNodes[i].position.y - layoutNodes[j].position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // 거리가 너무 가까울 때 폭발적인 척력이 발생하는 것 방지 (최소 5px 보호)
        const safeDist = Math.max(dist, 5);
        const force = (k * k) / safeDist;
        disp[i].x += (dx / dist) * force;
        disp[i].y += (dy / dist) * force;
      }
    }

    // B. 인력 (Attraction) 계산: 연결된 노드 쌍 사이에 작용하는 끌어당기는 힘
    for (const edge of edges) {
      const sourceIdx = layoutNodes.findIndex((n) => n.id === edge.source);
      const targetIdx = layoutNodes.findIndex((n) => n.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) continue;

      const dx = layoutNodes[sourceIdx].position.x - layoutNodes[targetIdx].position.x;
      const dy = layoutNodes[sourceIdx].position.y - layoutNodes[targetIdx].position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // 인력은 거리가 멀어질수록 강하게 끌어당김
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      disp[sourceIdx].x -= fx;
      disp[sourceIdx].y -= fy;
      disp[targetIdx].x += fx;
      disp[targetIdx].y += fy;
    }

    // C. 중심 중력 (Gravity) 계산: 화면 밖으로 이탈하지 않도록 화면 중심으로 부드럽게 복귀시킴
    const gravity = 0.06;
    for (let i = 0; i < layoutNodes.length; i++) {
      const dx = center.x - layoutNodes[i].position.x;
      const dy = center.y - layoutNodes[i].position.y;
      disp[i].x += dx * gravity;
      disp[i].y += dy * gravity;
    }

    // D. 위치 업데이트 및 무브먼트 리밋 적용 (cooling)
    for (let i = 0; i < layoutNodes.length; i++) {
      const dx = disp[i].x;
      const dy = disp[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // 최대 움직임 임계값을 설정하여 프레임 튀김(Jitter) 방지
      const maxMotion = 35 * cooling;
      const motion = Math.min(dist, maxMotion);

      layoutNodes[i].position.x += (dx / dist) * motion;
      layoutNodes[i].position.y += (dy / dist) * motion;
    }

    cooling *= 0.94; // 감쇠율 조정하여 70회 내외로 빠르게 안정화되게 함
  }

  return layoutNodes;
}
