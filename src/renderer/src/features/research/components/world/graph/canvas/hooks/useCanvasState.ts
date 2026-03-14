import { useEffect, useMemo, useRef, useState } from "react";
import { useEdgesState, useNodesState, type Node } from "reactflow";
import { useTranslation } from "react-i18next";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import { useWorldGraphLayout } from "@renderer/features/research/hooks/useWorldGraphLayout";
import { toRFNode, toRFEdge } from "@renderer/features/research/utils/worldGraphUtils";

export function useCanvasState({
  graphNodes,
  graphEdges,
  selectedNodeId,
}: {
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
  selectedNodeId: string | null;
}) {
  const { i18n } = useTranslation();
  const [optimisticDeletedNodeIds, setOptimisticDeletedNodeIds] = useState<Set<string>>(new Set());
  const [optimisticDeletedEdgeIds, setOptimisticDeletedEdgeIds] = useState<Set<string>>(new Set());

  // Clean up optimistic deletes when the items vanish from DB
  useEffect(() => {
    setOptimisticDeletedNodeIds((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((id) => graphNodes.some((node) => node.id === id)));
      return next.size === current.size ? current : next;
    });
  }, [graphNodes]);

  useEffect(() => {
    setOptimisticDeletedEdgeIds((current) => {
      if (current.size === 0) return current;
      const next = new Set([...current].filter((id) => graphEdges.some((edge) => edge.id === id)));
      return next.size === current.size ? current : next;
    });
  }, [graphEdges]);

  const visibleGraphNodes = useMemo(
    () => graphNodes.filter((node) => !optimisticDeletedNodeIds.has(node.id)),
    [graphNodes, optimisticDeletedNodeIds]
  );
  
  const visibleGraphEdges = useMemo(
    () =>
      graphEdges.filter(
        (edge) =>
          !optimisticDeletedEdgeIds.has(edge.id) &&
          !optimisticDeletedNodeIds.has(edge.sourceId) &&
          !optimisticDeletedNodeIds.has(edge.targetId)
      ),
    [graphEdges, optimisticDeletedEdgeIds, optimisticDeletedNodeIds]
  );

  const rfNodes = useMemo(
    () => visibleGraphNodes.map((node, index) => toRFNode(node, index, selectedNodeId)),
    [selectedNodeId, visibleGraphNodes]
  );

  const rfEdges = useMemo(() => {
    const translate = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });
    const nodeById = new Map(rfNodes.map((node) => [node.id, node] as const));
    return visibleGraphEdges.map((edge) => toRFEdge(edge, translate, nodeById));
  }, [i18n, rfNodes, visibleGraphEdges]);

  const graphNodeById = useMemo(
    () => new Map(visibleGraphNodes.map((node) => [node.id, node] as const)),
    [visibleGraphNodes]
  );

  const { layoutedNodes, layoutedEdges } = useWorldGraphLayout({
    nodes: rfNodes,
    edges: rfEdges,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync back layout changes to local state
  useEffect(() => {
    setEdges((prev) => {
      if (
        prev.length === layoutedEdges.length &&
        prev.every((edge, index) => {
          const next = layoutedEdges[index];
          return edge.id === next.id && edge.label === next.label && edge.source === next.source && edge.target === next.target;
        })
      ) {
        return prev;
      }
      return layoutedEdges;
    });
  }, [layoutedEdges, setEdges]);

  const lastStorePositions = useRef<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    setNodes((prev) => {
      let isChanged = false;
      const prevById = new Map(prev.map((node) => [node.id, node] as const));
      const sourceRfNodesById = new Map(rfNodes.map((node) => [node.id, node] as const));
      const draftNodes = prev.filter(n => n.type === "draft");
      const nextNodes = layoutedNodes.map((layoutNode: Node) => {
        const existing = prevById.get(layoutNode.id);
        const sourceRfNode = sourceRfNodesById.get(layoutNode.id);
        const lastPos = lastStorePositions.current[layoutNode.id];

        if (sourceRfNode) {
          lastStorePositions.current[layoutNode.id] = { x: sourceRfNode.position.x, y: sourceRfNode.position.y };
        }

        if (!existing) {
          isChanged = true;
          return layoutNode;
        }

        const dbPosChanged =
          lastPos &&
          sourceRfNode &&
          (lastPos.x !== sourceRfNode.position.x || lastPos.y !== sourceRfNode.position.y);

        let newPos = existing.position;

        if (!existing.dragging && dbPosChanged) {
          newPos = sourceRfNode!.position; 
        }

        const needsUpdate =
          existing.position.x !== newPos.x ||
          existing.position.y !== newPos.y ||
          existing.selected !== layoutNode.selected ||
          existing.data?.label !== layoutNode.data?.label ||
          existing.data?.subType !== layoutNode.data?.subType ||
          existing.data?.importance !== layoutNode.data?.importance;

        if (needsUpdate) {
          isChanged = true;
          return {
            ...existing,
            data: layoutNode.data,
            selected: layoutNode.selected,
            position: newPos,
          };
        }
        return existing;
      });

      if (isChanged || prev.length !== (layoutedNodes.length + draftNodes.length)) {
        return [...nextNodes, ...draftNodes];
      }
      return prev;
    });
  }, [layoutedNodes, rfNodes, setNodes]);

  return {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    layoutedNodes,
    graphNodeById,
    rfNodes,
    setOptimisticDeletedNodeIds,
    setOptimisticDeletedEdgeIds,
  };
}
