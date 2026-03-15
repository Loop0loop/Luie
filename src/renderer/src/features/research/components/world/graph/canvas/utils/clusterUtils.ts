import type { Node } from "reactflow";

export const CLUSTER_NODE_W = 220;
export const CLUSTER_NODE_H = 120;
export const CLUSTER_COLS = 3;
export const CLUSTER_GAP_X = 300;
export const CLUSTER_GAP_Y = 60;

export function computeClusterPositions(nodes: Node[]): Record<string, { x: number; y: number }> {
  const groups = new Map<string, Node[]>();
  nodes
    .filter(
      (n) =>
        Boolean(
          n &&
            typeof n.id === "string" &&
            n.type !== "draft" &&
            n.position &&
            typeof n.position.x === "number" &&
            Number.isFinite(n.position.x) &&
            typeof n.position.y === "number" &&
            Number.isFinite(n.position.y),
        ),
    )
    .forEach((node) => {
      const key = (node.data?.subType ?? node.data?.entityType ?? "Unknown") as string;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(node);
    });

  const result: Record<string, { x: number; y: number }> = {};
  let groupX = 0;
  groups.forEach((groupNodes) => {
    groupNodes.forEach((node, i) => {
      const col = i % CLUSTER_COLS;
      const row = Math.floor(i / CLUSTER_COLS);
      result[node.id] = {
        x: groupX + col * CLUSTER_NODE_W,
        y: row * (CLUSTER_NODE_H + CLUSTER_GAP_Y),
      };
    });
    groupX += CLUSTER_COLS * CLUSTER_NODE_W + CLUSTER_GAP_X;
  });
  return result;
}
