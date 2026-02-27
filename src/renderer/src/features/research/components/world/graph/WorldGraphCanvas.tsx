/**
 * WorldGraphCanvas - React Flow 기반 세계관 그래프 캔버스
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  MarkerType,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { useDialog } from "@shared/ui/useDialog";
import { WORLD_ENTITY_TYPES, RELATION_COLORS } from "@shared/constants/world";
import {
  getDefaultRelationForPair,
  isWorldEntityBackedType,
} from "@shared/constants/worldRelationRules";
import type { EntityRelation, WorldEntitySourceType, WorldGraphNode } from "@shared/types";
import type { WorldViewMode } from "@renderer/features/research/stores/worldBuildingStore";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { CustomEntityNode } from "./CustomEntityNode";

const nodeTypes = {
  custom: CustomEntityNode,
};

interface WorldGraphCanvasProps {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
  viewMode: WorldViewMode;
}

type CreateMenuState = {
  flowX: number;
  flowY: number;
  left: number;
  top: number;
};

type NodeMenuState = {
  nodeId: string;
  left: number;
  top: number;
};

const FALLBACK_COLUMNS = 4;
const FALLBACK_X_STEP = 280;
const FALLBACK_Y_STEP = 180;
const CREATE_MENU_WIDTH_PX = 220;
const CREATE_MENU_HEIGHT_PX = 340;
const NODE_MENU_WIDTH_PX = 180;
const NODE_MENU_HEIGHT_PX = 110;
const MENU_MARGIN_PX = 8;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const hashText = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getMenuPosition = (
  container: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  width: number,
  height: number,
): { left: number; top: number } => {
  if (!container) {
    return { left: clientX, top: clientY };
  }

  const rect = container.getBoundingClientRect();
  const localLeft = clientX - rect.left;
  const localTop = clientY - rect.top;
  const maxLeft = Math.max(MENU_MARGIN_PX, rect.width - width - MENU_MARGIN_PX);
  const maxTop = Math.max(MENU_MARGIN_PX, rect.height - height - MENU_MARGIN_PX);

  return {
    left: clamp(localLeft, MENU_MARGIN_PX, maxLeft),
    top: clamp(localTop, MENU_MARGIN_PX, maxTop),
  };
};

const readAttributePosition = (
  attributes: WorldGraphNode["attributes"],
): { x: number; y: number } | null => {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) {
    return null;
  }
  const graphPosition = (attributes as Record<string, unknown>).graphPosition;
  if (!graphPosition || typeof graphPosition !== "object" || Array.isArray(graphPosition)) {
    return null;
  }
  const x = (graphPosition as Record<string, unknown>).x;
  const y = (graphPosition as Record<string, unknown>).y;
  if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
};

const getFallbackPosition = (nodeId: string, index: number): { x: number; y: number } => {
  const hash = hashText(nodeId);
  const col = hash % FALLBACK_COLUMNS;
  const row = Math.floor(index / FALLBACK_COLUMNS);
  const waveOffsetX = row % 2 === 0 ? 0 : 90;
  const jitterX = (hash % 7) * 14 - 42;
  const jitterY = (Math.floor(hash / 7) % 7) * 12 - 36;
  return {
    x: col * FALLBACK_X_STEP + waveOffsetX + jitterX,
    y: row * FALLBACK_Y_STEP + jitterY,
  };
};

function toRFNode(
  graphNode: WorldGraphNode,
  index: number,
  selectedNodeId: string | null,
): Node {
  const subType = graphNode.subType ?? graphNode.entityType;
  const importance = (graphNode.attributes?.importance ?? 3) as number;
  const explicitPosition =
    graphNode.positionX !== 0 || graphNode.positionY !== 0
      ? { x: graphNode.positionX, y: graphNode.positionY }
      : null;
  const attributePosition = readAttributePosition(graphNode.attributes);
  const fallbackPosition = getFallbackPosition(graphNode.id, index);

  return {
    id: graphNode.id,
    position: explicitPosition ?? attributePosition ?? fallbackPosition,
    data: {
      label: graphNode.name,
      subType,
      importance,
    },
    selected: selectedNodeId === graphNode.id,
    type: "custom",
  };
}

function toRFEdge(relation: EntityRelation, translate: (key: string, fallback: string) => string): Edge {
  const color = RELATION_COLORS[relation.relation] ?? "#94a3b8";
  return {
    id: relation.id,
    source: relation.sourceId,
    target: relation.targetId,
    label: translate(`world.graph.relationTypes.${relation.relation}`, relation.relation),
    labelStyle: { fontSize: 10, fill: "#94a3b8", fontWeight: 500 },
    labelBgStyle: { fill: "transparent" },
    style: { stroke: color, strokeWidth: 2 },
    animated: relation.relation === "causes" || relation.relation === "controls",
    markerEnd: { type: MarkerType.ArrowClosed, color },
  };
}

export function WorldGraphCanvas({ nodes: graphNodes, edges: graphEdges, viewMode }: WorldGraphCanvasProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const dialog = useDialog();
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);
  const createGraphNode = useWorldBuildingStore((state) => state.createGraphNode);
  const createRelation = useWorldBuildingStore((state) => state.createRelation);
  const updateWorldEntityPosition = useWorldBuildingStore((state) => state.updateWorldEntityPosition);
  const updateGraphNode = useWorldBuildingStore((state) => state.updateGraphNode);
  const deleteGraphNode = useWorldBuildingStore((state) => state.deleteGraphNode);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [createMenu, setCreateMenu] = useState<CreateMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);

  const rfNodes = useMemo(
    () => graphNodes.map((node, index) => toRFNode(node, index, selectedNodeId)),
    [graphNodes, selectedNodeId],
  );
  const rfEdges = useMemo(() => {
    const translate = (key: string, fallback: string) =>
      i18n.t(key, { defaultValue: fallback });
    return graphEdges.map((edge) => toRFEdge(edge, translate));
  }, [graphEdges, i18n]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);

  useEffect(() => {
    setNodes((prev) => {
      if (
        prev.length === rfNodes.length &&
        prev.every((node, index) => {
          const next = rfNodes[index];
          return (
            node.id === next.id &&
            node.position.x === next.position.x &&
            node.position.y === next.position.y &&
            node.selected === next.selected &&
            node.data?.label === next.data?.label &&
            node.data?.subType === next.data?.subType
          );
        })
      ) {
        return prev;
      }
      return rfNodes;
    });
  }, [rfNodes, setNodes]);

  useEffect(() => {
    setEdges((prev) => {
      if (
        prev.length === rfEdges.length &&
        prev.every((edge, index) => {
          const next = rfEdges[index];
          return edge.id === next.id && edge.label === next.label && edge.source === next.source && edge.target === next.target;
        })
      ) {
        return prev;
      }
      return rfEdges;
    });
  }, [rfEdges, setEdges]);

  const onNodeDragStop: NodeMouseHandler = useCallback(
    (_, node) => {
      const movedNode = graphNodes.find((graphNode) => graphNode.id === node.id);
      if (!movedNode) {
        return;
      }

      const nextX = Math.round(node.position.x);
      const nextY = Math.round(node.position.y);

      if (isWorldEntityBackedType(movedNode.entityType)) {
        void updateWorldEntityPosition({
          id: node.id,
          positionX: nextX,
          positionY: nextY,
        });
        return;
      }

      const currentAttributes =
        movedNode.attributes && typeof movedNode.attributes === "object" && !Array.isArray(movedNode.attributes)
          ? movedNode.attributes
          : {};
      void updateGraphNode({
        id: movedNode.id,
        entityType: movedNode.entityType,
        subType: movedNode.subType,
        attributes: {
          ...currentAttributes,
          graphPosition: { x: nextX, y: nextY },
        },
      });
    },
    [graphNodes, updateGraphNode, updateWorldEntityPosition],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceType = (graphNodes.find((node) => node.id === params.source)?.entityType ??
        "Character") as WorldEntitySourceType;
      const targetType = (graphNodes.find((node) => node.id === params.target)?.entityType ??
        "Character") as WorldEntitySourceType;
      const relation = getDefaultRelationForPair(sourceType, targetType);
      if (!relation) {
        showToast(t("world.graph.canvas.invalidRelation"), "error");
        return;
      }

      void createRelation({
        projectId: activeProjectId ?? "",
        sourceId: params.source,
        sourceType,
        targetId: params.target,
        targetType,
        relation,
      }).then((created) => {
        if (!created) {
          showToast(t("world.graph.canvas.invalidRelation"), "error");
        }
      });
    },
    [activeProjectId, createRelation, graphNodes, showToast, t],
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setCreateMenu(null);
      setNodeMenu(null);
      selectNode(node.id);
    },
    [selectNode],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      event.stopPropagation();
      const { left, top } = getMenuPosition(
        canvasRef.current,
        event.clientX,
        event.clientY,
        NODE_MENU_WIDTH_PX,
        NODE_MENU_HEIGHT_PX,
      );
      setCreateMenu(null);
      selectNode(node.id);
      setNodeMenu({
        nodeId: node.id,
        left,
        top,
      });
    },
    [selectNode],
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      setCreateMenu(null);
      setNodeMenu(null);
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  const onPaneClick = useCallback(() => {
    setCreateMenu(null);
    setNodeMenu(null);
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!activeProjectId || !rfInstance) return;
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const menuPosition = getMenuPosition(
        canvasRef.current,
        event.clientX,
        event.clientY,
        CREATE_MENU_WIDTH_PX,
        CREATE_MENU_HEIGHT_PX,
      );
      setCreateMenu({
        flowX: position.x,
        flowY: position.y,
        left: menuPosition.left,
        top: menuPosition.top,
      });
      setNodeMenu(null);
    },
    [activeProjectId, rfInstance],
  );

  const handleCreateNode = useCallback(
    async (entityType: WorldEntitySourceType) => {
      if (!activeProjectId || !createMenu) return;
      setCreateMenu(null);
      const created = await createGraphNode({
        projectId: activeProjectId,
        entityType,
        subType:
          entityType === "Place" ||
          entityType === "Concept" ||
          entityType === "Rule" ||
          entityType === "Item"
            ? entityType
            : undefined,
        name: t("world.graph.canvas.newEntityName", { type: t(`world.graph.entityTypes.${entityType}`, { defaultValue: entityType }) }),
        positionX: createMenu.flowX,
        positionY: createMenu.flowY,
      });
      if (!created) {
        showToast(t("world.graph.canvas.createFailed"), "error");
      }
    },
    [activeProjectId, createGraphNode, createMenu, showToast, t],
  );

  const styledNodes = useMemo(() => {
    if (viewMode !== "protagonist" || !selectedNodeId) return nodes;
    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: node.id === selectedNodeId ? 1 : 0.35,
      },
    }));
  }, [nodes, viewMode, selectedNodeId]);

  const handleFocusNode = useCallback(() => {
    if (!nodeMenu) return;
    selectNode(nodeMenu.nodeId);
    setNodeMenu(null);
  }, [nodeMenu, selectNode]);

  const handleDeleteNode = useCallback(async () => {
    if (!nodeMenu) return;
    const targetNode = graphNodes.find((node) => node.id === nodeMenu.nodeId);
    if (!targetNode) {
      setNodeMenu(null);
      return;
    }
    const confirmed = await dialog.confirm({
      title: t("world.graph.canvas.deleteNode"),
      message: t("world.graph.canvas.deleteEntityConfirm", {
        name: targetNode.name,
      }),
      isDestructive: true,
    });
    if (!confirmed) return;
    setNodeMenu(null);
    await deleteGraphNode(targetNode.id);
  }, [deleteGraphNode, dialog, graphNodes, nodeMenu, t]);

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%" }} className="bg-app relative">
      <ReactFlow
        nodes={styledNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onInit={setRfInstance}
        fitView
        minZoom={0.1}
        maxZoom={2}
        deleteKeyCode={null}
        className="react-flow-premium"
      >
        <Background
          variant={BackgroundVariant.Cross}
          gap={24}
          size={2}
          color="var(--border-default)"
          className="opacity-35"
        />
      </ReactFlow>

      {createMenu && (
        <div
          className="absolute z-20 min-w-48 rounded-lg border border-border bg-panel shadow-xl p-2"
          style={{
            left: createMenu.left,
            top: createMenu.top,
          }}
        >
          <p className="px-2 pb-2 text-[11px] font-semibold text-muted">
            {t("world.graph.canvas.addEntity")}
          </p>
          <div className="max-h-64 overflow-y-auto">
            {WORLD_ENTITY_TYPES.map((entityType) => (
              <button
                key={entityType}
                type="button"
                onClick={() => void handleCreateNode(entityType)}
                className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-element transition-colors"
              >
                {t(`world.graph.entityTypes.${entityType}`, { defaultValue: entityType })}
              </button>
            ))}
          </div>
        </div>
      )}

      {nodeMenu && (
        <div
          className="absolute z-20 w-[180px] rounded-lg border border-border bg-panel shadow-xl p-2"
          style={{
            left: nodeMenu.left,
            top: nodeMenu.top,
          }}
        >
          <button
            type="button"
            onClick={handleFocusNode}
            className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-element transition-colors text-fg"
          >
            {t("world.graph.canvas.focusNode")}
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteNode()}
            className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-destructive/15 transition-colors text-destructive"
          >
            {t("world.graph.canvas.deleteNode")}
          </button>
        </div>
      )}
    </div>
  );
}
