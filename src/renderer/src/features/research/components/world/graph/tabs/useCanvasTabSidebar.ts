import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type {
  EntityRelation,
  WorldEntityType,
  WorldGraphNode,
} from "@shared/types";
import { buildGraphNodeDefaultName } from "./canvasNodeNaming";
import {
  buildMigratedRelationInputs,
  canUpdateTypeInPlace,
  findDuplicateTargetNode,
} from "./canvasNodeConversion";

export function useCanvasTabSidebar({
  projectId,
  graphNodes,
  graphEdges,
  selectedNodeId,
  onSelectNode,
  onCreatedEntity,
}: {
  projectId: string | null;
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
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
  const createRelation = useWorldBuildingStore((state) => state.createRelation);

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

  const handleChangeNodeType = useCallback(
    async (
      entityType: Parameters<typeof createGraphNode>[0]["entityType"],
      subType?: Parameters<typeof createGraphNode>[0]["subType"],
    ) => {
      const selectedNode = graphNodes.find(
        (node) => node.id === effectiveSelectedNodeId,
      );
      if (!selectedNode || !projectId) return;

      if (
        selectedNode.entityType === entityType &&
        (selectedNode.subType ?? undefined) === (subType ?? undefined)
      ) {
        return;
      }

      const canUpdateInPlace = canUpdateTypeInPlace(
        selectedNode.entityType,
        entityType,
      );

      if (canUpdateInPlace) {
        await updateGraphNode({
          id: selectedNode.id,
          entityType,
          subType:
            entityType === "WorldEntity"
              ? (subType ?? selectedNode.subType ?? "Place")
              : (subType ?? selectedNode.subType),
          name: selectedNode.name,
          description: selectedNode.description ?? undefined,
          attributes:
            selectedNode.attributes &&
            typeof selectedNode.attributes === "object"
              ? (selectedNode.attributes as Record<string, unknown>)
              : undefined,
        });
        onCreatedEntity(entityType, selectedNode.id);
        return;
      }

      const duplicateTargetNode = findDuplicateTargetNode({
        nodes: graphNodes,
        selectedNodeId: selectedNode.id,
        selectedNodeName: selectedNode.name,
        nextEntityType: entityType,
        nextSubType: subType as WorldEntityType | undefined,
      });

      if (duplicateTargetNode) {
        const relationInputs = buildMigratedRelationInputs({
          projectId,
          selectedNodeId: selectedNode.id,
          targetNode: {
            id: duplicateTargetNode.id,
            entityType: duplicateTargetNode.entityType,
          },
          graphEdges,
        });

        await Promise.all(relationInputs.map((input) => createRelation(input)));
        await deleteGraphNode(selectedNode.id);
        onSelectNode(duplicateTargetNode.id);
        onCreatedEntity(entityType, duplicateTargetNode.id);
        return;
      }

      const created = await createGraphNode({
        projectId,
        entityType,
        subType,
        name: selectedNode.name,
        description: selectedNode.description ?? undefined,
        positionX: selectedNode.positionX,
        positionY: selectedNode.positionY,
        attributes:
          selectedNode.attributes && typeof selectedNode.attributes === "object"
            ? (selectedNode.attributes as Record<string, unknown>)
            : undefined,
      });

      if (!created) return;

      const relationInputs = buildMigratedRelationInputs({
        projectId,
        selectedNodeId: selectedNode.id,
        targetNode: {
          id: created.id,
          entityType: created.entityType,
        },
        graphEdges,
      });

      await Promise.all(relationInputs.map((input) => createRelation(input)));

      await deleteGraphNode(selectedNode.id);
      onSelectNode(created.id);
      onCreatedEntity(entityType, created.id);
    },
    [
      createGraphNode,
      createRelation,
      deleteGraphNode,
      effectiveSelectedNodeId,
      graphEdges,
      graphNodes,
      onCreatedEntity,
      onSelectNode,
      projectId,
      updateGraphNode,
    ],
  );

  const selectedNode =
    graphNodes.find((node) => node.id === effectiveSelectedNodeId) ?? null;

  return {
    selectedNode,
    handleCreatePreset,
    handleSaveNode,
    handleDeleteNode,
    handleChangeNodeType,
  };
}
