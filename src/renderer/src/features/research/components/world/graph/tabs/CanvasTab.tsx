import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CanvasView } from "../views/CanvasView";
import { buildGraphNodeDefaultName } from "./canvasNodeNaming";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphNode,
} from "@shared/types";

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
  const { t } = useTranslation();
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

  const handleCreatePreset = useCallback(
    async (
      entityType: Parameters<typeof createGraphNode>[0]["entityType"],
      subType?: Parameters<typeof createGraphNode>[0]["subType"],
      position?: { x: number; y: number },
    ) => {
      if (!projectId) return;

      const created = await createGraphNode({
        projectId,
        entityType,
        subType,
        name: buildGraphNodeDefaultName(entityType, t),
        positionX: position?.x ?? 140 + graphNodes.length * 32,
        positionY: position?.y ?? 140 + graphNodes.length * 24,
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

  const handleCreateCanvasBlock = useCallback(
    (position?: { x: number; y: number }) => {
      void handleCreatePreset("Concept", "Concept", position);
    },
    [handleCreatePreset],
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
    [graphCanvasEdges, setGraphCanvasEdges],
  );

  const handleAddTimelineBranch = useCallback(
    async (sourceNodeId: string) => {
      if (!projectId) return;
      const sourceNode = graphNodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) return;

      const created = await createGraphNode({
        projectId,
        entityType: "Event",
        name: t("research.graph.nodeDefaults.timelineBranch"),
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
    [createGraphNode, createRelation, graphNodes, projectId, onSelectNode, t],
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
