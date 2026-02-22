import { useCallback, useEffect, useRef, useState } from "react";
import type { Edge, Node, Connection, NodeChange, EdgeChange, ReactFlowInstance } from "reactflow";
import { addEdge, useNodesState, useEdgesState, MarkerType, applyNodeChanges, applyEdgeChanges } from "reactflow";
import { useTranslation } from "react-i18next";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { worldPackageStorage } from "@renderer/features/research/services/worldPackageStorage";
import type { MindMapNodeData } from "@renderer/features/research/components/world/MindMapNodeData";

const getCssNumber = (name: string, fallback: number) => {
    if (typeof window === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function useMindMapBoard() {
    const { t } = useTranslation();
    const { currentItem: currentProject } = useProjectStore();
    const flowRef = useRef<ReactFlowInstance | null>(null);
    const rootX = getCssNumber("--world-mindmap-root-x", 300);
    const rootY = getCssNumber("--world-mindmap-root-y", 300);
    const hydratedProjectIdRef = useRef<string | null>(null);

    const getDefaultNodes = useCallback(
        () => [
            {
                id: "root",
                type: "character",
                position: { x: rootX, y: rootY },
                data: { label: t("world.mindmap.rootLabel") },
            },
        ],
        [rootX, rootY, t],
    );

    const [nodes, setNodes] = useNodesState(getDefaultNodes());
    const [edges, setEdges] = useEdgesState([]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const pendingNodeChangesRef = useRef<NodeChange[]>([]);
    const pendingEdgeChangesRef = useRef<EdgeChange[]>([]);
    const rafNodesRef = useRef<number | null>(null);
    const rafEdgesRef = useRef<number | null>(null);

    const flushNodeChanges = useCallback(() => {
        rafNodesRef.current = null;
        if (pendingNodeChangesRef.current.length === 0) return;
        const changes = pendingNodeChangesRef.current;
        pendingNodeChangesRef.current = [];
        setNodes((nds) => applyNodeChanges(changes, nds));
    }, [setNodes]);

    const flushEdgeChanges = useCallback(() => {
        rafEdgesRef.current = null;
        if (pendingEdgeChangesRef.current.length === 0) return;
        const changes = pendingEdgeChangesRef.current;
        pendingEdgeChangesRef.current = [];
        setEdges((eds) => applyEdgeChanges(changes, eds));
    }, [setEdges]);

    const onNodesChangeBatched = useCallback(
        (changes: NodeChange[]) => {
            pendingNodeChangesRef.current.push(...changes);
            if (rafNodesRef.current === null) {
                rafNodesRef.current = window.requestAnimationFrame(flushNodeChanges);
            }
        },
        [flushNodeChanges],
    );

    const onEdgesChangeBatched = useCallback(
        (changes: EdgeChange[]) => {
            pendingEdgeChangesRef.current.push(...changes);
            if (rafEdgesRef.current === null) {
                rafEdgesRef.current = window.requestAnimationFrame(flushEdgeChanges);
            }
        },
        [flushEdgeChanges],
    );

    useEffect(() => {
        if (!currentProject?.id) {
            setNodes(getDefaultNodes());
            setEdges([]);
            hydratedProjectIdRef.current = null;
            return;
        }

        let cancelled = false;
        void (async () => {
            const loaded = await worldPackageStorage.loadMindmap(
                currentProject.id,
                currentProject.projectPath,
            );
            if (cancelled) return;
            const loadedNodes = loaded.nodes as Node<MindMapNodeData>[];
            const loadedEdges = loaded.edges as Edge[];
            setNodes(loadedNodes.length > 0 ? loadedNodes : getDefaultNodes());
            setEdges(loadedEdges);
            hydratedProjectIdRef.current = currentProject.id;
        })();

        return () => {
            cancelled = true;
        };
    }, [currentProject?.id, currentProject?.projectPath, getDefaultNodes, setEdges, setNodes]);

    useEffect(() => {
        if (!currentProject?.id) return;
        if (hydratedProjectIdRef.current !== currentProject.id) return;

        const timer = window.setTimeout(() => {
            const serializedNodes = nodes.map((node) => ({
                id: node.id,
                type: node.type,
                position: node.position,
                data: {
                    label:
                        typeof (node.data as Record<string, unknown> | undefined)?.label === "string"
                            ? ((node.data as Record<string, unknown>).label as string)
                            : "",
                    image:
                        typeof (node.data as Record<string, unknown> | undefined)?.image === "string"
                            ? ((node.data as Record<string, unknown>).image as string)
                            : undefined,
                },
            }));

            const serializedEdges = edges.map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                type: edge.type,
            }));

            void worldPackageStorage.saveMindmap(currentProject.id, currentProject.projectPath, {
                nodes: serializedNodes,
                edges: serializedEdges,
            });
        }, 250);

        return () => {
            window.clearTimeout(timer);
        };
    }, [currentProject?.id, currentProject?.projectPath, edges, nodes]);

    const onConnect = useCallback(
        (params: Connection) =>
            setEdges((eds) =>
                addEdge(
                    {
                        ...params,
                        type: "smoothstep",
                        markerEnd: { type: MarkerType.ArrowClosed },
                        style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
                    },
                    eds,
                ),
            ),
        [setEdges],
    );

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    };

    const onPaneDoubleClick = useCallback(
        (event: React.MouseEvent) => {
            const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
            const instance = flowRef.current;
            if (!instance) return;

            const position = instance.project({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            const newNodeId = Date.now().toString();
            const newNode: Node<MindMapNodeData> = {
                id: newNodeId,
                type: "character",
                position,
                data: { label: t("world.mindmap.newTopic") },
            };

            setNodes((nds) => nds.concat(newNode));
            setSelectedNodeId(newNodeId);
        },
        [setNodes, t],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!selectedNodeId) return;

            if (e.key === "Enter") {
                e.preventDefault();
                const selectedNode = nodes.find((n) => n.id === selectedNodeId);
                if (!selectedNode) return;

                const newNodeId = Date.now().toString();
                const newNode: Node = {
                    id: newNodeId,
                    type: "character",
                    position: {
                        x: selectedNode.position.x + 200,
                        y: selectedNode.position.y,
                    },
                    data: { label: t("world.mindmap.newTopic") },
                };
                setNodes((nds) => nds.concat(newNode));
                setSelectedNodeId(newNodeId);
            }

            if (e.key === "Tab") {
                e.preventDefault();
                const selectedNode = nodes.find((n) => n.id === selectedNodeId);
                if (!selectedNode) return;

                const newNodeId = Date.now().toString();
                const newNode: Node = {
                    id: newNodeId,
                    type: "character",
                    position: {
                        x: selectedNode.position.x + 150,
                        y: selectedNode.position.y + 150,
                    },
                    data: { label: t("world.mindmap.subTopic") },
                };

                const newEdge: Edge = {
                    id: `e${selectedNodeId}-${newNodeId}`,
                    source: selectedNodeId,
                    target: newNodeId,
                    type: "smoothstep",
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: { stroke: 'var(--accent-primary)', strokeWidth: 2 },
                };

                setNodes((nds) => nds.concat(newNode));
                setEdges((eds) => eds.concat(newEdge));
                setSelectedNodeId(newNodeId);
            }

            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedNodeId === "root") return;
                setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
                setEdges((eds) =>
                    eds.filter(
                        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
                    ),
                );
                setSelectedNodeId(null);
            }
        },
        [selectedNodeId, nodes, setNodes, setEdges, t],
    );

    return {
        t,
        flowRef,
        nodes,
        edges,
        onNodesChangeBatched,
        onEdgesChangeBatched,
        onConnect,
        onNodeClick,
        onPaneDoubleClick,
        handleKeyDown,
        setSelectedNodeId,
    };
}
