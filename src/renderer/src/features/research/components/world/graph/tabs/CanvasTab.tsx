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
  normalizeHandlePairForNodeKinds,
  resolveCanvasEndpointNodeKind,
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

      const latestGraphNodes =
        useWorldBuildingStore.getState().graphData?.nodes ?? graphNodes;

      const existingNameSet = new Set(
        latestGraphNodes
          .filter(
            (node) =>
              node.entityType === "WorldEntity" &&
              (node.subType === "Place" || !node.subType),
          )
          .map((node) => node.name.trim().toLocaleLowerCase())
          .filter((name) => name.length > 0),
      );

      const nextName = buildNextCanvasBlockName(
        latestGraphNodes.map((node) => node.name),
        t("research.graph.nodeDefaults.place", "New Place"),
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
        positionX: position?.x ?? 140 + latestGraphNodes.length * 32,
        positionY: position?.y ?? 140 + latestGraphNodes.length * 24,
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
      if (!graphNodes.some((node) => node.id === nodeId)) {
        return;
      }

      const deleted = await deleteGraphNode(nodeId);
      if (deleted && selectedNodeId === nodeId) {
        onSelectNode(null);
      }
    },
    [
      deleteGraphNode,
      graphNodes,
      onSelectNode,
      selectedNodeId,
    ],
  );

  const handleDeleteRelation = useCallback(
    async (relationId: string) => {
      const deleted = await deleteRelation(relationId);
      if (!deleted) {
        return;
      }

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

      const latestGraphData = useWorldBuildingStore.getState().graphData;
      const latestGraphNodes = latestGraphData?.nodes ?? graphNodes;
      const latestGraphEdges = latestGraphData?.edges ?? graphEdges;
      const latestCanvasBlocks =
        latestGraphData?.canvasBlocks ?? graphCanvasBlocks;
      const graphNodeIds = new Set(latestGraphNodes.map((node) => node.id));
      const canvasBlockIds = new Set(latestCanvasBlocks.map((node) => node.id));
      const normalizedPair = normalizeHandlePairForNodeKinds({
        sourceHandle,
        targetHandle,
        sourceNodeKind: resolveCanvasEndpointNodeKind(
          sourceId,
          graphNodeIds,
          canvasBlockIds,
        ),
        targetNodeKind: resolveCanvasEndpointNodeKind(
          targetId,
          graphNodeIds,
          canvasBlockIds,
        ),
      });

      const shouldReverse = normalizedPair?.orientation === "reversed";
      const normalizedSourceId = shouldReverse ? targetId : sourceId;
      const normalizedTargetId = shouldReverse ? sourceId : targetId;
      const normalizedSourceHandle = normalizedPair?.sourceHandle;
      const normalizedTargetHandle = normalizedPair?.targetHandle;

      const resolveEntityType = (nodeId: string) => {
        const node = latestGraphNodes.find((item) => item.id === nodeId);

        return node?.entityType;
      };

      const sourceType = resolveEntityType(normalizedSourceId);
      const targetType = resolveEntityType(normalizedTargetId);
      const shouldPersistHandleHint =
        normalizedSourceHandle !== undefined &&
        normalizedTargetHandle !== undefined;

      const canonicalRelationExists = latestGraphEdges.some(
        (edge) =>
          edge.sourceId === normalizedSourceId &&
          edge.targetId === normalizedTargetId &&
          edge.sourceType === sourceType &&
          edge.targetType === targetType,
      );

      if (sourceType && targetType && projectId) {
        if (canonicalRelationExists) {
          return;
        }
        const created = await createRelation({
          projectId,
          sourceId: normalizedSourceId,
          sourceType,
          targetId: normalizedTargetId,
          targetType,
          relation: "belongs_to",
        });
        if (created) {
          if (shouldPersistHandleHint) {
            const latestCanvasEdgesAfterCreate =
              useWorldBuildingStore.getState().graphData?.canvasEdges ??
              graphCanvasEdges;
            const hintId = buildEntityRelationHintEdgeId(created.id);
            const withoutHint = latestCanvasEdgesAfterCreate.filter(
              (edge) => edge.id !== hintId,
            );
            const nextHint: WorldGraphCanvasEdge = {
              id: hintId,
              sourceId: normalizedSourceId,
              sourceHandle: normalizedSourceHandle,
              targetId: normalizedTargetId,
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
        sourceId: normalizedSourceId,
        sourceHandle: normalizedSourceHandle,
        targetId: normalizedTargetId,
        targetHandle: normalizedTargetHandle,
        relation: "related",
        direction: "unidirectional",
      };

      const latestCanvasEdgesAfterCreate =
        useWorldBuildingStore.getState().graphData?.canvasEdges ??
        graphCanvasEdges;
      await setGraphCanvasEdges([...latestCanvasEdgesAfterCreate, nextEdge]);
    },
    [
      createRelation,
      graphEdges,
      graphCanvasBlocks,
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

      const latestGraphData = useWorldBuildingStore.getState().graphData;
      const latestGraphNodes = latestGraphData?.nodes ?? graphNodes;
      const latestCanvasBlocks =
        latestGraphData?.canvasBlocks ?? graphCanvasBlocks;

      const sourceGraphNode = latestGraphNodes.find((n) => n.id === sourceNodeId);
      const sourceCanvasBlock = latestCanvasBlocks.find(
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

      const getHandleSides = (dir: string) => {
        switch (dir) {
          case "up":
            return { source: "top", target: "bottom" };
          case "down":
            return { source: "bottom", target: "top" };
          case "left":
            return { source: "left", target: "right" };
          case "right":
            return { source: "right", target: "left" };
          default:
            return { source: "right", target: "left" };
        }
      };

      const handleSides = getHandleSides(direction);
      const sourceKind = sourceGraphNode ? "graph" : "canvas";
      const targetKind = sourceGraphNode ? "graph" : "canvas";
      const handles = normalizeHandlePairForNodeKinds({
        sourceHandle: `${handleSides.source}-source`,
        targetHandle: `${handleSides.target}-target`,
        sourceNodeKind: sourceKind,
        targetNodeKind: targetKind,
      });

      if (!handles) {
        return;
      }

      if (sourceGraphNode) {
        const created = await createGraphNode({
          projectId,
          entityType: "Event",
          name: t("research.graph.nodeDefaults.event", "New Event"),
          positionX: targetX,
          positionY: targetY,
        });

        if (!created) return;

        // Ensure canvas relationships and hints are rendered perfectly
        await handleCreateCanvasRelation({
          sourceId: sourceNodeId,
          targetId: created.id,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
        });

        onSelectNode(created.id);
      } else if (sourceCanvasBlock) {
        const newBlockId = generateLocalId("t");
        const latestCanvasBlocksAfterCreate =
          useWorldBuildingStore.getState().graphData?.canvasBlocks ??
          graphCanvasBlocks;

        await setGraphCanvasBlocks([
          ...latestCanvasBlocksAfterCreate,
          {
            id: newBlockId,
            type: "timeline",
            positionX: targetX,
            positionY: targetY,
            data: { content: "", isHeld: false },
          },
        ]);

        const edgeId = generateLocalId("e");
        const latestCanvasEdgesAfterCreate =
          useWorldBuildingStore.getState().graphData?.canvasEdges ??
          graphCanvasEdges;

        await setGraphCanvasEdges([
          ...latestCanvasEdgesAfterCreate,
          {
            id: edgeId,
            sourceId: sourceNodeId,
            targetId: newBlockId,
            sourceHandle: handles.sourceHandle,
            targetHandle: handles.targetHandle,
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
