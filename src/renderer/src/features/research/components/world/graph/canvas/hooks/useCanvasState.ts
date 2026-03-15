import { useEffect, useMemo, useRef, useState } from "react";
import { useEdgesState, useNodesState, type Node } from "reactflow";
import { useTranslation } from "react-i18next";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import { useWorldGraphLayout } from "@renderer/features/research/hooks/useWorldGraphLayout";
import {
  isRenderableRFNode,
  toRFEdge,
  toRFNode,
} from "@renderer/features/research/utils/worldGraphUtils";

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

  const liveNodeIds = useMemo(
    () => new Set(graphNodes.map((node) => node?.id).filter((id): id is string => typeof id === "string")),
    [graphNodes],
  );
  const liveEdgeIds = useMemo(
    () => new Set(graphEdges.map((edge) => edge?.id).filter((id): id is string => typeof id === "string")),
    [graphEdges],
  );
  const effectiveDeletedNodeIds = useMemo(
    () => new Set([...optimisticDeletedNodeIds].filter((id) => liveNodeIds.has(id))),
    [liveNodeIds, optimisticDeletedNodeIds],
  );
  const effectiveDeletedEdgeIds = useMemo(
    () => new Set([...optimisticDeletedEdgeIds].filter((id) => liveEdgeIds.has(id))),
    [liveEdgeIds, optimisticDeletedEdgeIds],
  );

  const visibleGraphNodes = useMemo(
    () =>
      graphNodes.filter(
        (node): node is WorldGraphNode =>
          Boolean(
              node &&
              typeof node.id === "string" &&
              node.id.length > 0 &&
              typeof node.entityType === "string" &&
              !effectiveDeletedNodeIds.has(node.id),
          ),
      ),
    [effectiveDeletedNodeIds, graphNodes]
  );
  
  const visibleGraphEdges = useMemo(
    () =>
      graphEdges.filter(
        (edge): edge is EntityRelation =>
          Boolean(
            edge &&
              typeof edge.id === "string" &&
              edge.id.length > 0 &&
              typeof edge.sourceId === "string" &&
              edge.sourceId.length > 0 &&
              typeof edge.targetId === "string" &&
              edge.targetId.length > 0 &&
              !effectiveDeletedEdgeIds.has(edge.id) &&
              !effectiveDeletedNodeIds.has(edge.sourceId) &&
              !effectiveDeletedNodeIds.has(edge.targetId),
          )
      ),
    [effectiveDeletedEdgeIds, effectiveDeletedNodeIds, graphEdges]
  );

  const rfNodes = useMemo(
    () =>
      visibleGraphNodes
        .map((node, index) => toRFNode(node, index, selectedNodeId))
        .filter(isRenderableRFNode),
    [selectedNodeId, visibleGraphNodes]
  );

  const rfEdges = useMemo(() => {
    const translate = (key: string, fallback: string) => i18n.t(key, { defaultValue: fallback });
    const nodeById = new Map(rfNodes.map((node) => [node.id, node] as const));
    return visibleGraphEdges
      .map((edge) => toRFEdge(edge, translate, nodeById))
      .filter((edge): edge is NonNullable<typeof edge> => edge !== null);
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
      const safePrev = prev.filter(
        (node): node is Node =>
          Boolean(node && typeof node.id === "string" && node.id.length > 0),
      );
      let isChanged = false;
      const prevById = new Map(safePrev.map((node) => [node.id, node] as const));
      const sourceRfNodesById = new Map(rfNodes.map((node) => [node.id, node] as const));
      const draftNodes = safePrev.filter((node) => node.type === "draft");
      const nextNodes = layoutedNodes.filter(isRenderableRFNode).map((layoutNode: Node) => {
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
        if (!existing.position || typeof existing.position.x !== "number" || typeof existing.position.y !== "number") {
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
        if (
          !newPos ||
          typeof newPos.x !== "number" ||
          !Number.isFinite(newPos.x) ||
          typeof newPos.y !== "number" ||
          !Number.isFinite(newPos.y)
        ) {
          isChanged = true;
          return layoutNode;
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

      if (isChanged || safePrev.length !== (layoutedNodes.length + draftNodes.length)) {
        return [...nextNodes, ...draftNodes];
      }
      return safePrev;
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
