import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useDialog } from "@shared/ui/useDialog";
import { CanvasView } from "../views/CanvasView";
import type {
  EntityRelation,
  WorldGraphCanvasBlock,
  WorldGraphCanvasEdge,
  WorldGraphNode,
} from "@shared/types";
import { buildNextCanvasBlockName } from "./canvasNodeNaming";
import {
  buildEntityRelationHintEdgeId,
  generateLocalId,
} from "../utils/canvasFlowUtils";
import { GRAPH_CANVAS_DEFAULT_EDGE_COLORS } from "../shared/canvas/graphCanvasConstants";

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
  const dialog = useDialog();
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

      const existingNameSet = new Set(
        graphNodes
          .filter(
            (node) =>
              node.entityType === "WorldEntity" &&
              (node.subType === "Place" || !node.subType),
          )
          .map((node) => node.name.trim().toLocaleLowerCase())
          .filter((name) => name.length > 0),
      );

      const nextName = buildNextCanvasBlockName(
        graphNodes.map((node) => node.name),
      );

      if (existingNameSet.has(nextName.trim().toLocaleLowerCase())) {
        dialog.toast(
          t(
            "research.graph.canvas.duplicateBlockName",
            "동일한 이름의 블럭이 이미 존재합니다.",
          ),
          "info",
        );
        return;
      }

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
      dialog,
      graphNodes,
      onCreatedEntity,
      onSelectNode,
      projectId,
      t,
    ],
  );

  const handleDeleteNode = useCallback(
    async (nodeId: string) => {
      const targetNode = graphNodes.find((node) => node.id === nodeId);
      if (!targetNode) {
        return;
      }

      const confirmed = await dialog.confirm({
        title: t(
          "research.graph.canvas.deleteEntityTitle",
          "정말 삭제하시겠습니까?",
        ),
        message: t(
          "research.graph.canvas.deleteEntityMessage",
          `"${targetNode.name}" 항목과 연결된 관계가 삭제됩니다.`,
        ),
        confirmLabel: t("common.delete", "삭제"),
        cancelLabel: t("common.cancel", "취소"),
        isDestructive: true,
      });
      if (!confirmed) {
        return;
      }

      const latestCanvasEdges =
        useWorldBuildingStore.getState().graphData?.canvasEdges ??
        graphCanvasEdges;
      const nextCanvasEdges = latestCanvasEdges.filter(
        (edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId,
      );
      if (nextCanvasEdges.length !== latestCanvasEdges.length) {
        await setGraphCanvasEdges(nextCanvasEdges);
      }

      const deleted = await deleteGraphNode(nodeId);
      if (deleted && selectedNodeId === nodeId) {
        onSelectNode(null);
      }
    },
    [
      deleteGraphNode,
      dialog,
      graphCanvasEdges,
      graphNodes,
      onSelectNode,
      selectedNodeId,
      setGraphCanvasEdges,
      t,
    ],
  );

  const handleDeleteRelation = useCallback(
    async (relationId: string) => {
      await deleteRelation(relationId);
      const latestCanvasEdges =
        useWorldBuildingStore.getState().graphData?.canvasEdges ??
        graphCanvasEdges;
      const hintId = buildEntityRelationHintEdgeId(relationId);
      const withoutHint = latestCanvasEdges.filter(
        (edge) => edge.id !== hintId,
      );
      if (withoutHint.length !== latestCanvasEdges.length) {
        await setGraphCanvasEdges(withoutHint);
      }
    },
    [deleteRelation, graphCanvasEdges, setGraphCanvasEdges],
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

      const normalizedSourceHandle =
        typeof sourceHandle === "string" && sourceHandle.length > 0
          ? sourceHandle
          : undefined;
      const normalizedTargetHandle =
        typeof targetHandle === "string" && targetHandle.length > 0
          ? targetHandle
          : undefined;
      const shouldPersistHandleHint =
        normalizedSourceHandle !== undefined &&
        normalizedTargetHandle !== undefined;

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
          if (shouldPersistHandleHint) {
            const latestCanvasEdges =
              useWorldBuildingStore.getState().graphData?.canvasEdges ??
              graphCanvasEdges;
            const hintId = buildEntityRelationHintEdgeId(created.id);
            const withoutHint = latestCanvasEdges.filter(
              (edge) => edge.id !== hintId,
            );
            const nextHint: WorldGraphCanvasEdge = {
              id: hintId,
              sourceId,
              sourceHandle: normalizedSourceHandle,
              targetId,
              targetHandle: normalizedTargetHandle,
              relation: "",
              direction: "none",
            };
            await setGraphCanvasEdges([...withoutHint, nextHint]);
          }
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
    async (
      sourceNodeId: string,
      direction: "up" | "down" | "left" | "right",
    ) => {
      if (!projectId) return;

      const sourceGraphNode = graphNodes.find((n) => n.id === sourceNodeId);
      const sourceCanvasBlock = graphCanvasBlocks.find(
        (n) => n.id === sourceNodeId,
      );

      if (!sourceGraphNode && !sourceCanvasBlock) return;

      let targetX =
        sourceGraphNode?.positionX ?? sourceCanvasBlock?.positionX ?? 0;
      let targetY =
        sourceGraphNode?.positionY ?? sourceCanvasBlock?.positionY ?? 0;

      if (direction === "up") {
        targetY -= 220;
      } else if (direction === "down") {
        targetY += 220;
      } else if (direction === "left") {
        targetX -= 300;
      } else if (direction === "right") {
        targetX += 300;
      }

      const getHandles = (dir: string) => {
        switch (dir) {
          case "up":
            return { source: "top-out", target: "bottom-in" };
          case "down":
            return { source: "bottom-out", target: "top-in" };
          case "left":
            return { source: "left-out", target: "right-in" };
          case "right":
            return { source: "right-out", target: "left-in" };
          default:
            return { source: "right-out", target: "left-in" };
        }
      };

      const handles = getHandles(direction);

      if (sourceGraphNode) {
        const created = await createGraphNode({
          projectId,
          entityType: "Event",
          name: "새로운 블럭",
          positionX: targetX,
          positionY: targetY,
        });

        if (!created) return;

        // Ensure canvas relationships and hints are rendered perfectly
        await handleCreateCanvasRelation({
          sourceId: sourceNodeId,
          targetId: created.id,
          sourceHandle: handles.source,
          targetHandle: handles.target,
        });

        onSelectNode(created.id);
      } else if (sourceCanvasBlock) {
        const newBlockId = generateLocalId("t");

        setGraphCanvasBlocks([
          ...graphCanvasBlocks,
          {
            id: newBlockId,
            type: "timeline",
            positionX: targetX,
            positionY: targetY,
            data: { content: "", isHeld: false },
          },
        ]);

        const edgeId = generateLocalId("e");

        setGraphCanvasEdges([
          ...graphCanvasEdges,
          {
            id: edgeId,
            sourceId: sourceNodeId,
            targetId: newBlockId,
            sourceHandle: handles.source,
            targetHandle: handles.target,
            relation: "next",
            direction: "unidirectional",
            color:
              sourceCanvasBlock.data?.color ??
              GRAPH_CANVAS_DEFAULT_EDGE_COLORS[0],
          },
        ]);

        onSelectNode(newBlockId);
      }
    },
    [
      createGraphNode,
      handleCreateCanvasRelation,
      graphNodes,
      graphCanvasBlocks,
      graphCanvasEdges,
      projectId,
      onSelectNode,
      setGraphCanvasBlocks,
      setGraphCanvasEdges,
    ],
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
