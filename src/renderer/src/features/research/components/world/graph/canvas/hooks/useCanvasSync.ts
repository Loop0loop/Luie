import { useCallback, useEffect } from "react";
import { type Node, type ReactFlowInstance } from "reactflow";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import type { WorldEntitySourceType, WorldEntityType } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import { parseEntityDraftText } from "@renderer/features/research/utils/entityDraftUtils";

interface UseCanvasSyncProps {
  activeProjectId: string | null;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  rfInstance: ReactFlowInstance | null;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  removeDraftNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  setPaletteMode: (mode: "Event" | "Note" | null) => void;
}

export function useCanvasSync({
  activeProjectId,
  canvasRef,
  rfInstance,
  setNodes,
  removeDraftNode,
  selectNode,
  setPaletteMode,
}: UseCanvasSyncProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const createGraphNode = useWorldBuildingStore((state) => state.createGraphNode);

  const spawnDraftNode = useCallback(
    (x: number, y: number, initialType?: WorldEntitySourceType) => {
      if (!activeProjectId) return;

      setNodes((nds) => nds.filter((n) => n.type !== "draft"));

      const draftId = `draft-${Date.now()}`;
      const draftNode: Node = {
        id: draftId,
        type: "draft",
        position: { x, y },
        data: {
          id: draftId,
          initialValue: "",
          initialEntityType:
            initialType && initialType !== "WorldEntity" ? initialType : "Concept",
          onConvert: async (nodeId: string, payload: { text: string; entityType: WorldEntitySourceType }) => {
            removeDraftNode(nodeId);

            if (!payload.text.trim() || !activeProjectId) return;

            const { name, description } = parseEntityDraftText(payload.text);
            const entityType = payload.entityType;
            const subType =
              entityType === "Place" ||
              entityType === "Concept" ||
              entityType === "Rule" ||
              entityType === "Item"
                ? entityType
                : undefined;

            try {
              await createGraphNode({
                projectId: activeProjectId,
                entityType,
                subType,
                name,
                description,
                positionX: x,
                positionY: y,
              });
            } catch {
              showToast(t("world.graph.canvas.createFailed"), "error");
            }
          },
        },
      };

      setNodes((nds) => nds.concat(draftNode));
    },
    [activeProjectId, createGraphNode, removeDraftNode, setNodes, showToast, t],
  );

  useEffect(() => {
    const handleSpawnDraft = async (payload: {
      entityType?: WorldEntitySourceType;
      subType?: string;
      instant?: boolean;
      position?: { x: number; y: number };
    }) => {
      if (!rfInstance) return;
      let pos = payload.position;

      if (!pos) {
        if (canvasRef.current) {
          const cx = canvasRef.current.clientWidth / 2;
          const cy = canvasRef.current.clientHeight / 2;
          pos = rfInstance.screenToFlowPosition({ x: cx, y: cy });
          pos.x += (Math.random() - 0.5) * 40;
          pos.y += (Math.random() - 0.5) * 40;
        } else {
          pos = { x: 0, y: 0 };
        }
      }

      if (payload.instant && activeProjectId) {
        let defaultName = "새로운 엔티티";
        let subType: WorldEntityType | undefined = undefined;
        let finalEntityType = payload.entityType ?? "Concept";

        if (payload.entityType === "Event") {
          defaultName = "새로운 시간";
          finalEntityType = "Event";
          subType = undefined;
        } else if (payload.entityType === "Concept") {
          defaultName = payload.subType === "Note" ? "새로운 노트" : "새로운 엔티티";
          finalEntityType = "Concept";
          subType = payload.subType as WorldEntityType | undefined;
        }

        try {
          await createGraphNode({
            projectId: activeProjectId,
            entityType: finalEntityType,
            subType,
            name: defaultName,
            positionX: pos.x,
            positionY: pos.y,
          });
        } catch {
          showToast(t("world.graph.canvas.createFailed"), "error");
        }
      } else {
        spawnDraftNode(pos.x, pos.y, payload.entityType);
      }
    };

    const handleOpenPalette = (payload: { mode: "Event" | "Note" }) => {
      setPaletteMode(payload.mode);
    };

    const handleFocus = (payload: { entityId: string }) => {
      selectNode(payload.entityId);
      if (rfInstance) {
        const node = rfInstance.getNode(payload.entityId);
        if (node) {
          rfInstance.setCenter(node.position.x, node.position.y, { duration: 800, zoom: 1.2 });
        }
      }
    };

    EditorSyncBus.on("SPAWN_GRAPH_DRAFT_NODE", handleSpawnDraft);
    EditorSyncBus.on("OPEN_COMMAND_PALETTE", handleOpenPalette);
    EditorSyncBus.on("FOCUS_ENTITY", handleFocus);
    
    return () => {
      EditorSyncBus.off("SPAWN_GRAPH_DRAFT_NODE", handleSpawnDraft);
      EditorSyncBus.off("OPEN_COMMAND_PALETTE", handleOpenPalette);
      EditorSyncBus.off("FOCUS_ENTITY", handleFocus);
    };
  }, [rfInstance, spawnDraftNode, activeProjectId, createGraphNode, showToast, t, canvasRef, setPaletteMode, selectNode]);

  return { spawnDraftNode };
}
