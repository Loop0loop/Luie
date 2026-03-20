import { useCallback } from "react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CanvasView } from "../views/CanvasView";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphNode,
} from "@shared/types";
import { buildNextCanvasBlockName } from "./canvasNodeNaming";

type CanvasTabProps = {
  projectId: string | null;
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
  graphCanvasBlocks: WorldGraphCanvasBlock[];
  graphCanvasEdges: WorldGraphCanvasEdge[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCreatedEntity: (entityType: string, newNodeId: string) => void;
};

export function CanvasTab({
  projectId,
  graphNodes,
  graphEdges,
  graphCanvasBlocks,
  graphCanvasEdges,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCreatedEntity,
}: CanvasTabProps) {
  const createGraphNode = useWorldBuildingStore(
    (state) => state.createGraphNode,
  );
  const updateGraphNodePosition = useWorldBuildingStore(
    (state) => state.updateGraphNodePosition,
  );
  const deleteGraphNode = useWorldBuildingStore(
    (state) => state.deleteGraphNode,
  );
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);
  const createRelation = useWorldBuildingStore((state) => state.createRelation);
  const setGraphCanvasBlocks = useWorldBuildingStore(
    (state) => state.setGraphCanvasBlocks,
  );
  const setGraphCanvasEdges = useWorldBuildingStore(
    (state) => state.setGraphCanvasEdges,
  );

  const effectiveSelectedNodeId = selectedNodeId;

  const handleCreateCanvasBlock = useCallback(
    (position?: { x: number; y: number }) => {
      if (!projectId) return;

      const nextName = buildNextCanvasBlockName(
        graphNodes.map((node) => node.name),
      );

      void createGraphNode({
        projectId,
        entityType: "WorldEntity",
        subType: "Place",
        name: nextName,
        positionX: position?.x ?? 140 + graphNodes.length * 32,
        positionY: position?.y ?? 140 + graphNodes.length * 24,
      }).then((created) => {
        if (!created) return;
        onSelectNode(created.id);
        onCreatedEntity("WorldEntity", created.id);
      });
    },
    [
      createGraphNode,
      graphNodes.length,
      onCreatedEntity,
      onSelectNode,
      projectId,
    ],
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const deleted = await deleteGraphNode(nodeId);
      if (deleted && selectedNodeId === nodeId) {
        onSelectNode(null);
      }
    },
    [deleteGraphNode, onSelectNode, selectedNodeId],
  );

  const handleDeleteRelation = useCallback(
    async (relationId: string) => {
      await deleteRelation(relationId);
    },
    [deleteRelation],
  );

  const handleCreateCanvasRelation = useCallback(
    async ({
      sourceId,
      targetId,
      sourceHandle,
      targetHandle,
    }: {
      sourceId: string;
      targetId: string;
      sourceHandle?: string | null;
      targetHandle?: string | null;
    }) => {
      if (sourceId === targetId) return;

      const resolveEntityType = (nodeId: string) => {
        const node =
          useWorldBuildingStore
            .getState()
            .graphData?.nodes.find((item) => item.id === nodeId) ??
          graphNodes.find((item) => item.id === nodeId);

        return node?.entityType;
      };

      const sourceType = resolveEntityType(sourceId);
      const targetType = resolveEntityType(targetId);

      if (sourceType && targetType && projectId) {
        const created = await createRelation({
          projectId,
          sourceId,
          sourceType,
          targetId,
          targetType,
          relation: "belongs_to",
        });
        if (created) {
          return;
        }
      }

      const nextEdge: WorldGraphCanvasEdge = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        sourceId,
        sourceHandle: sourceHandle ?? undefined,
        targetId,
        targetHandle: targetHandle ?? undefined,
        relation: "related",
        direction: "unidirectional",
      };

      const latestCanvasEdges =
        useWorldBuildingStore.getState().graphData?.canvasEdges ??
        graphCanvasEdges;
      await setGraphCanvasEdges([...latestCanvasEdges, nextEdge]);
    },
    [
      createRelation,
      graphCanvasEdges,
      graphNodes,
      projectId,
      setGraphCanvasEdges,
    ],
  );

  const handleAddTimelineBranch = useCallback(
    async (sourceNodeId: string) => {
      if (!projectId) return;
      const sourceNode = graphNodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      const sourceY = sourceNode.positionY || 0;
      const siblingEvents = graphNodes.filter(
        (node) => node.entityType === "Event" && node.id !== sourceNodeId,
      );
      const hasUpper = siblingEvents.some(
        (node) => (node.positionY || 0) < sourceY,
      );
      const branchDirection = hasUpper ? 1 : -1;
      const targetY = sourceY + 220 * branchDirection;

      const created = await createGraphNode({
        projectId,
        entityType: "Event",
        name: "새로운 블럭",
        positionX: sourceNode.positionX || 0,
        positionY: targetY,
      });

      if (!created) return;

      await createRelation({
        projectId,
        sourceId: sourceNodeId,
        sourceType: sourceNode.entityType,
        targetId: created.id,
        targetType: "Event",
        relation: "causes",
      });

      onSelectNode(created.id);
    },
    [createGraphNode, createRelation, graphNodes, projectId, onSelectNode],
  );

  return (
    <CanvasView
      nodes={graphNodes}
      edges={graphEdges}
      canvasBlocks={graphCanvasBlocks}
      canvasEdges={graphCanvasEdges}
      selectedNodeId={effectiveSelectedNodeId}
      autoLayoutTrigger={autoLayoutTrigger}
      onSelectNode={onSelectNode}
      onDeleteNode={handleDeleteNode}
      onCreateCanvasRelation={handleCreateCanvasRelation}
      onDeleteRelation={handleDeleteRelation}
      onCreateBlock={handleCreateCanvasBlock}
      onAddTimelineBranch={handleAddTimelineBranch}
      onCanvasBlocksCommit={(blocks) => {
        void setGraphCanvasBlocks(blocks);
      }}
      onCanvasEdgesCommit={(edges) => {
        void setGraphCanvasEdges(edges);
      }}
      onNodePositionCommit={({ id, x, y }) => {
        void updateGraphNodePosition({ id, positionX: x, positionY: y });
      }}
    />
  );
}
