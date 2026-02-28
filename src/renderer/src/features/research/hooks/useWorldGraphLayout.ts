import { useEffect, useState } from "react";
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
    const [layoutedNodes, setLayoutedNodes] = useState<Node[]>(nodes);
    const [layoutedEdges, setLayoutedEdges] = useState<Edge[]>(edges);

    useEffect(() => {
        if (nodes.length === 0) {
            setLayoutedNodes([]);
            setLayoutedEdges(edges);
            return;
        }

        if (viewMode === "standard" || viewMode === "freeform") {
            // Use original DB/store positions
            setLayoutedNodes(nodes);
            setLayoutedEdges(edges);
            return;
        }

        if (viewMode === "event-chain") {
            const g = new dagre.graphlib.Graph();
            g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });
            g.setDefaultEdgeLabel(() => ({}));

            nodes.forEach((node) => {
                g.setNode(node.id, { width: DAGRE_NODE_WIDTH, height: DAGRE_NODE_HEIGHT });
            });

            // Filter self-loops before adding to dagre to prevent malformed chain renders
            const validEdges = edges.filter(e => e.source !== e.target);
            validEdges.forEach((edge) => {
                // In event-chain, prioritize 'causes' relationships for the horizontal timeline
                const weight = edge.data?.relation === "causes" ? 100 : 1;
                g.setEdge(edge.source, edge.target, { weight });
            });

            dagre.layout(g);

            const newNodes = nodes.map((node) => {
                const nodeWithPosition = g.node(node.id);
                return {
                    ...node,
                    position: {
                        x: nodeWithPosition.x - DAGRE_NODE_WIDTH / 2,
                        y: nodeWithPosition.y - DAGRE_NODE_HEIGHT / 2,
                    },
                };
            });

            setLayoutedNodes(newNodes);
            setLayoutedEdges(edges);
            return;
        }

        if (viewMode === "protagonist") {
            // Radial Layout around selected node, or largest hub if none selected
            let centerNodeId = selectedNodeId;

            if (!centerNodeId) {
                // Find node with most connections
                const connectionCounts: Record<string, number> = {};
                edges.forEach((e) => {
                    connectionCounts[e.source] = (connectionCounts[e.source] || 0) + 1;
                    connectionCounts[e.target] = (connectionCounts[e.target] || 0) + 1;
                });
                const chars = nodes.filter((n) => n.data?.entityType === "Character");
                const candidatePool = chars.length > 0 ? chars : nodes;

                centerNodeId = candidatePool.reduce((max, node) =>
                    (connectionCounts[node.id] || 0) > (connectionCounts[max.id] || 0) ? node : max
                    , candidatePool[0])?.id;
            }

            if (!centerNodeId) {
                setLayoutedNodes(nodes);
                setLayoutedEdges(edges);
                return;
            }

            const centerNode = nodes.find((n) => n.id === centerNodeId);
            if (!centerNode) {
                setLayoutedNodes(nodes);
                setLayoutedEdges(edges);
                return;
            }

            // Group into concentric circles
            const radiusStep = 250;
            const centerPos = { x: 0, y: 0 };

            // Calculate degrees of separation
            const distances: Record<string, number> = { [centerNodeId]: 0 };
            let queue = [centerNodeId];

            while (queue.length > 0) {
                const curr = queue.shift()!;
                const dist = distances[curr];

                edges.forEach(e => {
                    const neighbor = e.source === curr ? e.target : e.target === curr ? e.source : null;
                    if (neighbor && distances[neighbor] === undefined) {
                        distances[neighbor] = dist + 1;
                        queue.push(neighbor);
                    }
                });
            }

            // Remaining nodes pushed to the furthest ring
            const maxDist = Math.max(1, ...Object.values(distances));
            nodes.forEach(n => {
                if (distances[n.id] === undefined) distances[n.id] = maxDist + 1;
            });

            const rings: Record<number, Node[]> = {};
            nodes.forEach(n => {
                const d = distances[n.id];
                if (!rings[d]) rings[d] = [];
                rings[d].push(n);
            });

            const newNodes = nodes.map(node => {
                if (node.id === centerNodeId) {
                    return { ...node, position: { x: centerPos.x, y: centerPos.y } };
                }
                const ringDist = distances[node.id];
                const ringNodes = rings[ringDist];
                const index = ringNodes.findIndex(n => n.id === node.id);
                const angle = (index / ringNodes.length) * 2 * Math.PI;
                const radius = ringDist * radiusStep;

                return {
                    ...node,
                    position: {
                        x: centerPos.x + Math.cos(angle) * radius,
                        y: centerPos.y + Math.sin(angle) * radius,
                    }
                };
            });

            setLayoutedNodes(newNodes);
            setLayoutedEdges(edges);
            return;
        }

    }, [nodes, edges, viewMode, selectedNodeId]);

    return { layoutedNodes, layoutedEdges };
}
