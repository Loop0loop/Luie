import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { type Edge, type Node } from "reactflow";
import { useDialog } from "@shared/ui/useDialog";
import { useToast } from "@shared/ui/ToastContext";
import type { EntityRelation, WorldGraphNode } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { collectWorldGraphSelectionSnapshot } from "../worldGraphCanvasKeyboard";

interface UseCanvasDeleteProps {
  nodes: Node[];
  edges: Edge[];
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  removeDraftNode: (nodeId: string) => void;
  setOptimisticDeletedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setOptimisticDeletedEdgeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onBeforeDelete?: () => void;
}

export function useCanvasDelete({
  nodes,
  edges,
  graphNodes,
  graphEdges,
  selectedNodeId,
  selectedEdgeId,
  removeDraftNode,
  setOptimisticDeletedNodeIds,
  setOptimisticDeletedEdgeIds,
  onBeforeDelete,
}: UseCanvasDeleteProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const dialog = useDialog();
  const deleteGraphNode = useWorldBuildingStore((state) => state.deleteGraphNode);
  const deleteRelation = useWorldBuildingStore((state) => state.deleteRelation);

  const runNodeDelete = useCallback(
    async (nodeId: string) => {
      setOptimisticDeletedNodeIds((current) => new Set(current).add(nodeId));
      const deleted = await deleteGraphNode(nodeId);
      if (deleted) {
        return true;
      }

      setOptimisticDeletedNodeIds((current) => {
        const next = new Set(current);
        next.delete(nodeId);
        return next;
      });
      showToast(t("world.graph.canvas.deleteFailed", "삭제하지 못했습니다."), "error");
      return false;
    },
    [deleteGraphNode, setOptimisticDeletedNodeIds, showToast, t],
  );

  const runRelationDelete = useCallback(
    async (edgeId: string) => {
      setOptimisticDeletedEdgeIds((current) => new Set(current).add(edgeId));
      const deleted = await deleteRelation(edgeId);
      if (deleted) {
        return true;
      }

      setOptimisticDeletedEdgeIds((current) => {
        const next = new Set(current);
        next.delete(edgeId);
        return next;
      });
      showToast(t("world.graph.canvas.deleteFailed", "삭제하지 못했습니다."), "error");
      return false;
    },
    [deleteRelation, setOptimisticDeletedEdgeIds, showToast, t],
  );

  const handleDeleteSelection = useCallback(async () => {
    const selection = collectWorldGraphSelectionSnapshot({
      localNodes: nodes,
      localEdges: edges,
      selectedNodeId,
      selectedEdgeId,
    });

    const selectedDraftNodes = nodes.filter(
      (node) => node.type === "draft" && selection.selectedNodeIds.includes(node.id),
    );
    const selectedGraphNodes = graphNodes.filter((node) =>
      selection.selectedNodeIds.includes(node.id),
    );
    const selectedRelations = graphEdges.filter((edge) =>
      selection.selectedEdgeIds.includes(edge.id),
    );

    const entityCount = selectedDraftNodes.length + selectedGraphNodes.length;
    const relationCount = selectedRelations.length;

    if (entityCount === 0 && relationCount === 0) {
      return;
    }

    const confirmed = await dialog.confirm({
      title: t("world.graph.canvas.deleteNode"),
      message:
        entityCount > 0
          ? t("world.graph.canvas.deleteEntityConfirm", {
              name:
                entityCount === 1
                  ? selectedGraphNodes[0]?.name ?? t("world.graph.canvas.entityFallbackName", "선택한 엔티티")
                  : t("world.graph.canvas.multipleEntities", { defaultValue: `${entityCount}개 엔티티` }),
            })
          : t("world.graph.canvas.deleteRelationConfirm", { defaultValue: `${relationCount}개 연결을 삭제할까요?` }),
      isDestructive: true,
    });

    if (!confirmed) {
      return;
    }

    onBeforeDelete?.();

    selectedDraftNodes.forEach((draftNode) => {
      removeDraftNode(draftNode.id);
    });
    
    await Promise.all(selectedGraphNodes.map(async (graphNode) => runNodeDelete(graphNode.id)));
    await Promise.all(selectedRelations.map(async (edge) => runRelationDelete(edge.id)));
  }, [
    nodes, edges, selectedNodeId, selectedEdgeId, graphNodes, graphEdges, 
    dialog, t, onBeforeDelete, removeDraftNode, runNodeDelete, runRelationDelete
  ]);

  return {
    runNodeDelete,
    runRelationDelete,
    handleDeleteSelection,
  };
}
