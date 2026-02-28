import { useMemo } from "react";
import type { Node, Edge } from "reactflow";
import dagre from "dagre";
import type { WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";

interface UseWorldGraphLayoutProps {
  nodes: Node[];
  edges: Edge[];
  viewMode: WorldViewMode;
  selectedNodeId: string | null;
}

const DAGRE_NODE_WIDTH = 180;
const DAGRE_NODE_HEIGHT = 60;

export function useWorldGraphLayout({ nodes, edges, viewMode, selectedNodeId }: UseWorldGraphLayoutProps) {
  const layoutedNodes = useMemo<Node[]>(() => {
    if (nodes.length === 0) {
      return [];
    }

    if (viewMode === "standard" || viewMode === "freeform") {
      return nodes;
    }

    if (viewMode === "event-chain") {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
      g.setDefaultEdgeLabel(() => ({}));

      nodes.forEach((node) => {
        g.setNode(node.id, { width: DAGRE_NODE_WIDTH, height: DAGRE_NODE_HEIGHT });
      });

      const validEdges = edges.filter((edge) => edge.source !== edge.target);
      validEdges.forEach((edge) => {
        const weight = edge.data?.relation === "causes" ? 100 : 1;
        g.setEdge(edge.source, edge.target, { weight });
      });

      dagre.layout(g);

      return nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        if (!nodeWithPosition) return node;
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - DAGRE_NODE_WIDTH / 2,
            y: nodeWithPosition.y - DAGRE_NODE_HEIGHT / 2,
          },
        };
      });
    }

    if (viewMode === "protagonist") {
      // Build adjacency list for O(n+m) BFS instead of O(n*m)
      const adjacencyList = new Map<string, string[]>();
      const degreeMap = new Map<string, number>();

      for (const node of nodes) {
        adjacencyList.set(node.id, []);
        degreeMap.set(node.id, 0);
      }
      for (const edge of edges) {
        adjacencyList.get(edge.source)?.push(edge.target);
        adjacencyList.get(edge.target)?.push(edge.source);
        degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
        degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
      }

      let centerNodeId = selectedNodeId;
      if (!centerNodeId) {
        const chars = nodes.filter((n) => n.data?.entityType === "Character");
        const pool = chars.length > 0 ? chars : nodes;
        centerNodeId = pool.reduce(
          (max, n) => (degreeMap.get(n.id) ?? 0) > (degreeMap.get(max.id) ?? 0) ? n : max,
          pool[0],
        )?.id;
      }

      if (!centerNodeId) return nodes;

      const centerNode = nodes.find((n) => n.id === centerNodeId);
      if (!centerNode) return nodes;

      // BFS using adjacency list — O(n+m)
      const distances = new Map<string, number>([[centerNodeId, 0]]);
      const queue: string[] = [centerNodeId];

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const dist = distances.get(curr) ?? 0;
        for (const neighbor of adjacencyList.get(curr) ?? []) {
          if (!distances.has(neighbor)) {
            distances.set(neighbor, dist + 1);
            queue.push(neighbor);
          }
        }
      }

      const maxDist = Math.max(1, ...distances.values());
      for (const node of nodes) {
        if (!distances.has(node.id)) {
          distances.set(node.id, maxDist + 1);
        }
      }

      const rings = new Map<number, Node[]>();
      for (const node of nodes) {
        const d = distances.get(node.id) ?? maxDist + 1;
        const ring = rings.get(d) ?? [];
        ring.push(node);
        rings.set(d, ring);
      }

      const RADIUS_STEP = 250;

      return nodes.map((node) => {
        if (node.id === centerNodeId) {
          return { ...node, position: { x: 0, y: 0 } };
        }
        const d = distances.get(node.id) ?? maxDist + 1;
        const ring = rings.get(d) ?? [node];
        const idx = ring.findIndex((n) => n.id === node.id);
        const angle = (Math.max(0, idx) / Math.max(ring.length, 1)) * 2 * Math.PI;
        const radius = d * RADIUS_STEP;
        return {
          ...node,
          position: {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          },
        };
      });
    }

    return nodes;
  }, [nodes, edges, viewMode, selectedNodeId]);

  const layoutedEdges = useMemo<Edge[]>(() => edges, [edges]);

  return { layoutedNodes, layoutedEdges };
}
