import type { Node, Edge } from "reactflow";
import type { GraphNodeData } from "../types/graph";

/** D3 없이 repulsion·attraction·gravity를 반복해 결정적인 force layout을 계산한다. */
export function calculateForceLayout(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  iterations = 70,
  center = { x: 300, y: 300 }
): Node<GraphNodeData>[] {
  if (nodes.length === 0) return [];

  const layoutNodes = nodes.map((node, index) => {
    const isPrime = node.data?.starGrade === "prime";
    const isMajor = node.data?.starGrade === "major";

    // NOTE: 같은 입력은 같은 layout을 만들도록 index로 초기 궤도 각도를 정한다.
    const angle = (index / nodes.length) * Math.PI * 2;
    const radius = isPrime ? 0 : isMajor ? 140 : 260;

    // NOTE: 저장된 위치가 없는 node의 좌표는 0이지 undefined가 아니다. nullish 병합으로
    // 궤도 초기화를 걸면 절대 적용되지 않고 모든 node가 (0,0)에 겹친다. 겹친 상태에서는
    // 두 node의 거리가 0이라 repulsion 방향 벡터가 0이 되어 아래 반복이 아무 일도 하지
    // 않는다. canvasFlowAdapter와 같은 기준(0,0 = 미저장)으로 판정한다.
    const hasPersistedPosition =
      Number.isFinite(node.position?.x) &&
      Number.isFinite(node.position?.y) &&
      (node.position.x !== 0 || node.position.y !== 0);

    return {
      ...node,
      position: hasPersistedPosition
        ? { x: node.position.x, y: node.position.y }
        : {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
          },
    };
  });

  const k = 220;
  let cooling = 1.0;

  // NOTE: 엣지마다 findIndex로 노드를 찾으면 반복 횟수 × 엣지 수 × 노드 수가 되어
  // 노드가 조금만 늘어도 layout이 프레임을 잡아먹는다. index는 반복 중 불변이므로
  // 루프 밖에서 한 번만 만든다.
  const indexById = new Map<string, number>();
  layoutNodes.forEach((node, index) => {
    indexById.set(node.id, index);
  });

  const edgePairs: { sourceIdx: number; targetIdx: number }[] = [];
  for (const edge of edges) {
    const sourceIdx = indexById.get(edge.source);
    const targetIdx = indexById.get(edge.target);
    if (sourceIdx === undefined || targetIdx === undefined) continue;
    edgePairs.push({ sourceIdx, targetIdx });
  }

  for (let iter = 0; iter < iterations; iter++) {
    const disp = layoutNodes.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < layoutNodes.length; i++) {
      const nodeI = layoutNodes[i];
      const isPrimeI = nodeI.data?.starGrade === "prime";

      for (let j = 0; j < layoutNodes.length; j++) {
        if (i === j) continue;
        const nodeJ = layoutNodes[j];
        
        const dx = nodeI.position.x - nodeJ.position.x;
        const dy = nodeI.position.y - nodeJ.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const safeDist = Math.max(dist, 20);

        const repFactor = isPrimeI ? 2.5 : 1.5;
        const force = (k * k * repFactor) / safeDist;
        
        disp[i].x += (dx / dist) * force;
        disp[i].y += (dy / dist) * force;
      }
    }

    for (const { sourceIdx, targetIdx } of edgePairs) {
      const dx = layoutNodes[sourceIdx].position.x - layoutNodes[targetIdx].position.x;
      const dy = layoutNodes[sourceIdx].position.y - layoutNodes[targetIdx].position.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // NOTE: 연결 node가 과도하게 뭉치지 않도록 attraction을 3.5배 감쇠한다.
      const force = (dist * dist) / (k * 3.5);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      disp[sourceIdx].x -= fx;
      disp[sourceIdx].y -= fy;
      disp[targetIdx].x += fx;
      disp[targetIdx].y += fy;
    }

    for (let i = 0; i < layoutNodes.length; i++) {
      const node = layoutNodes[i];
      const isPrime = node.data?.starGrade === "prime";
      
      if (isPrime) {
        const dx = center.x - node.position.x;
        const dy = center.y - node.position.y;
        disp[i].x += dx * 0.35;
        disp[i].y += dy * 0.35;
      } else {
        const dx = center.x - node.position.x;
        const dy = center.y - node.position.y;
        disp[i].x += dx * 0.008;
        disp[i].y += dy * 0.008;
      }
    }

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
