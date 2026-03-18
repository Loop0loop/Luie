import { useCallback, useMemo } from "react";
import { getDefaultRelationForPair } from "@shared/constants/worldRelationRules";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CanvasView } from "../views/CanvasView";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphNode,
} from "@shared/types";

const buildNodeName = (entityType: string) => {
  switch (entityType) {
    case "Character":
      return "새 인물";
    case "Event":
      return "새 사건";
    case "Place":
      return "새 장소";
    case "Concept":
      return "새 개념";
    default:
      return "새 엔티티";
  }
};

type CanvasTabProps = {
  projectId: string | null;
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
  graphCanvasBlocks: WorldGraphCanvasBlock[];
  selectedNodeId: string | null;
  autoLayoutTrigger: number;
  onSelectNode: (nodeId: string | null) => void;
  onCreateNote: () => void;
  onCreatedEntity: (entityType: string, newNodeId: string) => void;
};

export function CanvasTab({
  projectId,
  graphNodes,
  graphEdges,
  graphCanvasBlocks,
  selectedNodeId,
  autoLayoutTrigger,
  onSelectNode,
  onCreateNote,
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
  const createRelation = useWorldBuildingStore((state) => state.createRelation);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);
  const setGraphCanvasBlocks = useWorldBuildingStore(
    (state) => state.setGraphCanvasBlocks,
  );

  const effectiveSelectedNodeId =
    selectedNodeId && graphNodes.some((node) => node.id === selectedNodeId)
      ? selectedNodeId
      : (graphNodes[0]?.id ?? null);

  const handleCreatePreset = useCallback(
    async (
      entityType: Parameters<typeof createGraphNode>[0]["entityType"],
      subType?: Parameters<typeof createGraphNode>[0]["subType"],
    ) => {
      if (!projectId) return;

      const created = await createGraphNode({
        projectId,
        entityType,
        subType,
        name: buildNodeName(entityType),
        positionX: 140 + graphNodes.length * 32,
        positionY: 140 + graphNodes.length * 24,
      });

      if (!created) return;

      onSelectNode(created.id);
      onCreatedEntity(entityType, created.id);
    },
    [
      createGraphNode,
      graphNodes.length,
      projectId,
      onSelectNode,
      onCreatedEntity,
    ],
  );

  const handleCreateCanvasBlock = useCallback(() => {
    void handleCreatePreset("Concept", "Concept");
  }, [handleCreatePreset]);

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const deleted = await deleteGraphNode(nodeId);
      if (deleted && selectedNodeId === nodeId) {
        onSelectNode(null);
      }
    },
    [deleteGraphNode, onSelectNode, selectedNodeId],
  );

  const handleCreateRelation = useCallback(
    async ({ sourceId, targetId }: { sourceId: string; targetId: string }) => {
      if (!projectId || sourceId === targetId) return;

      const sourceNode = graphNodes.find((node) => node.id === sourceId);
      const targetNode = graphNodes.find((node) => node.id === targetId);
      if (!sourceNode || !targetNode) return;

      await createRelation({
        projectId,
        sourceId,
        sourceType: sourceNode.entityType,
        targetId,
        targetType: targetNode.entityType,
        relation: getDefaultRelationForPair(
          sourceNode.entityType,
          targetNode.entityType,
        ),
      });
    },
    [createRelation, graphNodes, projectId],
  );

  const handleDeleteRelation = useCallback(
    async (relationId: string) => {
      await deleteRelation(relationId);
    },
    [deleteRelation],
  );

  const handleAddTimelineBranch = useCallback(
    async (sourceNodeId: string) => {
      if (!projectId) return;
      const sourceNode = graphNodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      const created = await createGraphNode({
        projectId,
        entityType: "Event",
        name: "새 분계점",
        positionX: (sourceNode.positionX || 0) + 300,
        positionY: sourceNode.positionY || 0,
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
      selectedNodeId={effectiveSelectedNodeId}
      autoLayoutTrigger={autoLayoutTrigger}
      onSelectNode={onSelectNode}
      onDeleteNode={handleDeleteNode}
      onCreateRelation={handleCreateRelation}
      onDeleteRelation={handleDeleteRelation}
      onCreateBlock={handleCreateCanvasBlock}
      onAddTimelineBranch={handleAddTimelineBranch}
      onCreateNote={onCreateNote}
      onCanvasBlocksCommit={(blocks) => {
        void setGraphCanvasBlocks(blocks);
      }}
      onNodePositionCommit={({ id, x, y }) => {
        void updateGraphNodePosition({ id, positionX: x, positionY: y });
      }}
    />
  );
}

export function useCanvasTabSidebar({
  projectId,
  graphNodes,
  selectedNodeId,
  onSelectNode,
  onCreatedEntity,
}: {
  projectId: string | null;
  graphNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onCreatedEntity: (entityType: string, newNodeId: string) => void;
}) {
  const createGraphNode = useWorldBuildingStore(
    (state) => state.createGraphNode,
  );
  const updateGraphNode = useWorldBuildingStore(
    (state) => state.updateGraphNode,
  );
  const deleteGraphNode = useWorldBuildingStore(
    (state) => state.deleteGraphNode,
  );

  const effectiveSelectedNodeId =
    selectedNodeId && graphNodes.some((node) => node.id === selectedNodeId)
      ? selectedNodeId
      : (graphNodes[0]?.id ?? null);

  const selectedNode = useMemo(
    () =>
      graphNodes.find((node) => node.id === effectiveSelectedNodeId) ?? null,
    [effectiveSelectedNodeId, graphNodes],
  );

  const handleCreatePreset = useCallback(
    async (
      entityType: Parameters<typeof createGraphNode>[0]["entityType"],
      subType?: Parameters<typeof createGraphNode>[0]["subType"],
    ) => {
      if (!projectId) return;

      const created = await createGraphNode({
        projectId,
        entityType,
        subType,
        name: buildNodeName(entityType),
        positionX: 140 + graphNodes.length * 32,
        positionY: 140 + graphNodes.length * 24,
      });

      if (!created) return;

      onSelectNode(created.id);
      onCreatedEntity(entityType, created.id);
    },
    [
      createGraphNode,
      graphNodes.length,
      projectId,
      onSelectNode,
      onCreatedEntity,
    ],
  );

  const handleSaveNode = useCallback(
    async (input: { name: string; description: string }) => {
      if (!selectedNode) return;

      await updateGraphNode({
        id: selectedNode.id,
        entityType: selectedNode.entityType,
        name: input.name.trim() || selectedNode.name,
        description: input.description,
        subType: selectedNode.subType,
      });
    },
    [selectedNode, updateGraphNode],
  );

  const handleDeleteNode = useCallback(async () => {
    if (!selectedNode) return;

    const deleted = await deleteGraphNode(selectedNode.id);
    if (deleted) {
      onSelectNode(null);
    }
  }, [deleteGraphNode, onSelectNode, selectedNode]);

  return { selectedNode, handleCreatePreset, handleSaveNode, handleDeleteNode };
}
