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
      // Use original DB/store positions.
      return nodes;
    }

    if (viewMode === "event-chain") {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
      g.setDefaultEdgeLabel(() => ({}));

      nodes.forEach((node) => {
        g.setNode(node.id, { width: DAGRE_NODE_WIDTH, height: DAGRE_NODE_HEIGHT });
      });

      // Filter self-loops before adding to dagre to prevent malformed chain renders.
      const validEdges = edges.filter((edge) => edge.source !== edge.target);
      validEdges.forEach((edge) => {
        // In event-chain, prioritize "causes" relationships for the horizontal timeline.
        const weight = edge.data?.relation === "causes" ? 100 : 1;
        g.setEdge(edge.source, edge.target, { weight });
      });

      dagre.layout(g);

      return nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        if (!nodeWithPosition) {
          return node;
        }
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
      // Radial layout around selected node, or largest hub if none selected.
      let centerNodeId = selectedNodeId;

      if (!centerNodeId) {
        // Find node with most connections.
        const connectionCounts: Record<string, number> = {};
        edges.forEach((edge) => {
          connectionCounts[edge.source] = (connectionCounts[edge.source] || 0) + 1;
          connectionCounts[edge.target] = (connectionCounts[edge.target] || 0) + 1;
        });
        const chars = nodes.filter((node) => node.data?.entityType === "Character");
        const candidatePool = chars.length > 0 ? chars : nodes;
        centerNodeId = candidatePool.reduce(
          (max, node) =>
            (connectionCounts[node.id] || 0) > (connectionCounts[max.id] || 0) ? node : max,
          candidatePool[0],
        )?.id;
      }

      if (!centerNodeId) {
        return nodes;
      }

      const centerNode = nodes.find((node) => node.id === centerNodeId);
      if (!centerNode) {
        return nodes;
      }

      // Group into concentric circles.
      const radiusStep = 250;
      const centerPos = { x: 0, y: 0 };

      // Calculate degrees of separation.
      const distances: Record<string, number> = { [centerNodeId]: 0 };
      const queue: string[] = [centerNodeId];

      while (queue.length > 0) {
        const curr = queue.shift();
        if (!curr) continue;
        const dist = distances[curr] ?? 0;

        edges.forEach((edge) => {
          const neighbor =
            edge.source === curr ? edge.target : edge.target === curr ? edge.source : null;
          if (neighbor && distances[neighbor] === undefined) {
            distances[neighbor] = dist + 1;
            queue.push(neighbor);
          }
        });
      }

      // Remaining nodes pushed to the furthest ring.
      const maxDist = Math.max(1, ...Object.values(distances));
      nodes.forEach((node) => {
        if (distances[node.id] === undefined) {
          distances[node.id] = maxDist + 1;
        }
      });

      const rings: Record<number, Node[]> = {};
      nodes.forEach((node) => {
        const distance = distances[node.id] ?? maxDist + 1;
        if (!rings[distance]) rings[distance] = [];
        rings[distance].push(node);
      });

      return nodes.map((node) => {
        if (node.id === centerNodeId) {
          return { ...node, position: { x: centerPos.x, y: centerPos.y } };
        }

        const ringDist = distances[node.id] ?? maxDist + 1;
        const ringNodes = rings[ringDist] ?? [node];
        const index = ringNodes.findIndex((item) => item.id === node.id);
        const safeIndex = index >= 0 ? index : 0;
        const angle = (safeIndex / Math.max(ringNodes.length, 1)) * 2 * Math.PI;
        const radius = ringDist * radiusStep;

        return {
          ...node,
          position: {
            x: centerPos.x + Math.cos(angle) * radius,
            y: centerPos.y + Math.sin(angle) * radius,
          },
        };
      });
    }

    return nodes;
  }, [nodes, edges, viewMode, selectedNodeId]);

  const layoutedEdges = useMemo<Edge[]>(() => edges, [edges]);

  return { layoutedNodes, layoutedEdges };
}
