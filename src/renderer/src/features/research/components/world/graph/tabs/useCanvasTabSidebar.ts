import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type { WorldGraphNode } from "@shared/types";
import { buildGraphNodeDefaultName } from "./canvasNodeNaming";

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
  const { t } = useTranslation();
  const createGraphNode = useWorldBuildingStore(
    (state) => state.createGraphNode,
  );
  const updateGraphNode = useWorldBuildingStore(
    (state) => state.updateGraphNode,
  );
  const deleteGraphNode = useWorldBuildingStore(
    (state) => state.deleteGraphNode,
  );

  const effectiveSelectedNodeId = selectedNodeId;

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
        name: buildGraphNodeDefaultName(entityType, t),
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
      t,
    ],
  );

  const handleSaveNode = useCallback(
    async (input: { name: string; description: string }) => {
      const selectedNode = graphNodes.find(
        (node) => node.id === effectiveSelectedNodeId,
      );
      if (!selectedNode) return;

      await updateGraphNode({
        id: selectedNode.id,
        entityType: selectedNode.entityType,
        name: input.name.trim() || selectedNode.name,
        description: input.description,
        subType: selectedNode.subType,
      });
    },
    [effectiveSelectedNodeId, graphNodes, updateGraphNode],
  );

  const handleDeleteNode = useCallback(async () => {
    const selectedNode = graphNodes.find(
      (node) => node.id === effectiveSelectedNodeId,
    );
    if (!selectedNode) return;

    const deleted = await deleteGraphNode(selectedNode.id);
    if (deleted) {
      onSelectNode(null);
    }
  }, [deleteGraphNode, effectiveSelectedNodeId, graphNodes, onSelectNode]);

  const selectedNode =
    graphNodes.find((node) => node.id === effectiveSelectedNodeId) ?? null;

  return { selectedNode, handleCreatePreset, handleSaveNode, handleDeleteNode };
}
