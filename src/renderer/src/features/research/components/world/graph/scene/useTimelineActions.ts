import { useCallback } from "react";
import { useToast } from "@shared/ui/ToastContext";
import { useTranslation } from "react-i18next";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useWorldGraphUiStore } from "@renderer/features/research/stores/worldGraphUiStore";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import { useWorldGraphScene } from "./useWorldGraphScene";

export function useTimelineActions() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const createGraphNode = useWorldBuildingStore((state) => state.createGraphNode);
  const createRelation = useWorldBuildingStore((state) => state.createRelation);
  const setActiveTab = useWorldGraphUiStore((state) => state.setActiveTab);
  const selectNode = useWorldGraphUiStore((state) => state.selectNode);
  const scene = useWorldGraphScene();

  const createRootEvent = useCallback(async () => {
    if (!activeProjectId) return null;
    const created = await createGraphNode({
      projectId: activeProjectId,
      entityType: "Event",
      name: t("world.graph.timeline.newEvent", "새 사건"),
      positionX: 120,
      positionY: 120,
    });
    if (!created) {
      showToast(
        t("world.graph.timeline.createFailed", "새 사건을 만들지 못했습니다."),
        "error",
      );
      return null;
    }
    selectNode(created.id);
    return created;
  }, [activeProjectId, createGraphNode, selectNode, showToast, t]);

  const createBranchEvent = useCallback(async () => {
    if (!activeProjectId || !scene.selectedNode) return null;
    const current = scene.selectedNode;
    const created = await createGraphNode({
      projectId: activeProjectId,
      entityType: "Event",
      name: t("world.graph.timeline.branchEvent", "새 분기 사건"),
      positionX: (current.positionX ?? 0) + 220,
      positionY: (current.positionY ?? 0) + 120,
    });
    if (!created) {
      showToast("분기 사건을 만들지 못했습니다.", "error");
      return null;
    }
    const relationCreated = await createRelation({
      projectId: activeProjectId,
      sourceId: current.id,
      sourceType: current.entityType,
      targetId: created.id,
      targetType: created.entityType,
      relation: "causes",
    });
    if (!relationCreated) {
      showToast("분기 연결을 만들지 못했습니다.", "error");
    }
    selectNode(created.id);
    return created;
  }, [activeProjectId, createGraphNode, createRelation, scene.selectedNode, selectNode, showToast, t]);

  const focusTimelineEventInGraph = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setActiveTab("graph");
    },
    [selectNode, setActiveTab],
  );

  const openEntityLinkPalette = useCallback(() => {
    if (!scene.selectedNode) return;
    setActiveTab("graph");
    requestAnimationFrame(() => {
      EditorSyncBus.emit("OPEN_COMMAND_PALETTE", { mode: "Event" });
    });
  }, [scene.selectedNode, setActiveTab]);

  return {
    createRootEvent,
    createBranchEvent,
    focusTimelineEventInGraph,
    openEntityLinkPalette,
  };
}
