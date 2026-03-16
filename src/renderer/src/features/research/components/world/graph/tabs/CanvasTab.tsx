import { useCallback, useMemo } from "react";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CanvasView } from "../views/CanvasView";
import type { EntityRelation, WorldGraphNode } from "@shared/types";

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
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onCreateNote: () => void;
  onCreatedEntity: (entityType: string, newNodeId: string) => void;
};

export function CanvasTab({
  projectId,
  graphNodes,
  graphEdges,
  selectedNodeId,
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

  const handleCreateTimelineEvent = useCallback(() => {
    void handleCreatePreset("Event");
  }, [handleCreatePreset]);

  return (
    <CanvasView
      nodes={graphNodes}
      edges={graphEdges}
      selectedNodeId={effectiveSelectedNodeId}
      onSelectNode={onSelectNode}
      onCreateBlock={handleCreateCanvasBlock}
      onCreateTimelineEvent={handleCreateTimelineEvent}
      onCreateNote={onCreateNote}
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

  return { selectedNode, handleCreatePreset, handleSaveNode };
}
