import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import type {
  EntityRelation,
  WorldEntitySourceType,
  WorldGraphNode,
} from "@shared/types";
import { buildGraphNodeDefaultName } from "./canvasNodeNaming";

const WORLD_ENTITY_TYPE_SET = new Set([
  "WorldEntity",
  "Place",
  "Concept",
  "Rule",
  "Item",
] as const);

const isWorldEntityType = (
  value: WorldEntitySourceType,
): value is "WorldEntity" | "Place" | "Concept" | "Rule" | "Item" =>
  WORLD_ENTITY_TYPE_SET.has(
    value as "WorldEntity" | "Place" | "Concept" | "Rule" | "Item",
  );

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

      const canUpdateInPlace =
        isWorldEntityType(selectedNode.entityType) &&
        isWorldEntityType(entityType);

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

      const connectedEdges = graphEdges.filter(
        (edge) =>
          edge.sourceId === selectedNode.id ||
          edge.targetId === selectedNode.id,
      );

      const relationInputs = connectedEdges
        .map((edge) => {
          const sourceId =
            edge.sourceId === selectedNode.id ? created.id : edge.sourceId;
          const targetId =
            edge.targetId === selectedNode.id ? created.id : edge.targetId;

          if (sourceId === targetId) {
            return null;
          }

          const sourceType =
            edge.sourceId === selectedNode.id
              ? created.entityType
              : edge.sourceType;
          const targetType =
            edge.targetId === selectedNode.id
              ? created.entityType
              : edge.targetType;

          return {
            projectId,
            sourceId,
            targetId,
            sourceType,
            targetType,
            relation: edge.relation,
          };
        })
        .filter(
          (input): input is Parameters<typeof createRelation>[0] =>
            input !== null,
        );

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
