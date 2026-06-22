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

  // 1. 복사본 생성 및 노드 성간 등급에 따른 초기 궤도 배치 (거성은 중앙 고정, 조연은 은하 궤도 분산)
  const layoutNodes = nodes.map((node) => {
    const isPrime = node.data?.starGrade === "prime";
    const isMajor = node.data?.starGrade === "major";
    
    // prime은 중앙에 완벽 고정 배치, major는 중간 궤도(140px 반경), minor는 외곽 궤도(260px 반경)에 균등 분산 시작
    const angle = Math.random() * Math.PI * 2;
    const radius = isPrime ? 0 : isMajor ? 140 : 260;
    
    return {
      ...node,
      position: {
        x: node.position?.x ?? (center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 40),
        y: node.position?.y ?? (center.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 40),
      },
    };
  });

  const k = 220; // 성간 은하 반경 척력 척도
  let cooling = 1.0;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = layoutNodes.map(() => ({ x: 0, y: 0 }));

    // A. 반발력 (Repulsion) 계산: 별들의 등급에 따른 가변 척력 (거성은 강력하게 주변을 밀쳐냄)
    for (let i = 0; i < layoutNodes.length; i++) {
      const nodeI = layoutNodes[i];
      const isPrimeI = nodeI.data?.starGrade === "prime";

      for (let j = 0; j < layoutNodes.length; j++) {
        if (i === j) continue;
        const nodeJ = layoutNodes[j];
        
        const dx = nodeI.position.x - nodeJ.position.x;
        const dy = nodeI.position.y - nodeJ.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // 노드 성간 반경 충돌 제어 (주변 별들은 20px 이상의 거리를 강제 유지)
        const safeDist = Math.max(dist, 20);
        
        // 거성(prime)과 일반 노드 사이에는 훨씬 강한 척력을 발휘해 사방으로 밀쳐냄
        const repFactor = isPrimeI ? 2.5 : 1.5;
        const force = (k * k * repFactor) / safeDist;
        
        disp[i].x += (dx / dist) * force;
        disp[i].y += (dy / dist) * force;
      }
    }

    // B. 인력 (Attraction) 계산: 별자리 성간선(에지) 장력 (인력이 너무 가까이 뭉치지 않도록 유연하게 제어)
    for (const edge of edges) {
      const sourceIdx = layoutNodes.findIndex((n) => n.id === edge.source);
      const targetIdx = layoutNodes.findIndex((n) => n.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) continue;

      const dx = layoutNodes[sourceIdx].position.x - layoutNodes[targetIdx].position.x;
      const dy = layoutNodes[sourceIdx].position.y - layoutNodes[targetIdx].position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // 궤도 연결선 장력은 거리에 비례하되, 너무 뭉치지 않도록 강도를 3.5배 이상 느슨하게 감쇠
      const force = (dist * dist) / (k * 3.5);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      disp[sourceIdx].x -= fx;
      disp[sourceIdx].y -= fy;
      disp[targetIdx].x += fx;
      disp[targetIdx].y += fy;
    }

    // C. 중심 중력 (Gravity) 및 우주 복귀력:
    // 거성(prime)은 완벽한 항성으로서 중앙에 강력히 홀딩, 
    // 행성 노드들은 우주 밖으로 흘러가지 않을 정도의 0.008 수준의 초미세 중력만 부여
    for (let i = 0; i < layoutNodes.length; i++) {
      const node = layoutNodes[i];
      const isPrime = node.data?.starGrade === "prime";
      
      if (isPrime) {
        // 코어 거성은 물리적 변위를 강하게 통제해 항상 중앙에 고정
        const dx = center.x - node.position.x;
        const dy = center.y - node.position.y;
        disp[i].x += dx * 0.35;
        disp[i].y += dy * 0.35;
      } else {
        // 주변 노드들은 은하 중력만 부드럽게 받음
        const dx = center.x - node.position.x;
        const dy = center.y - node.position.y;
        disp[i].x += dx * 0.008;
        disp[i].y += dy * 0.008;
      }
    }

    // D. 위치 업데이트 및 무브먼트 리밋 적용 (cooling)
    for (let i = 0; i < layoutNodes.length; i++) {
      const dx = disp[i].x;
      const dy = disp[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const maxMotion = 40 * cooling;
      const motion = Math.min(dist, maxMotion);

      layoutNodes[i].position.x += (dx / dist) * motion;
      layoutNodes[i].position.y += (dy / dist) * motion;
    }

    cooling *= 0.94;
  }

  return layoutNodes;
}
