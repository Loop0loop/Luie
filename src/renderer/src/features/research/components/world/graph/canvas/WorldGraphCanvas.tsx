/**
 * WorldGraphCanvas - React Flow 기반 세계관 그래프 캔버스
 */

import { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  Background,
  type Connection,
  type EdgeMouseHandler,
  type Node,
  type NodeDragHandler,
  type NodeMouseHandler,
  type ReactFlowInstance,
  BackgroundVariant,
  PanOnScrollMode,
  SelectionMode,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { useDialog } from "@shared/ui/useDialog";
import type { EntityRelation, WorldEntitySourceType, WorldGraphNode } from "@shared/types";
import { getDefaultRelationForPair } from "@shared/constants/worldRelationRules";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import {
  WORLD_GRAPH_CREATE_MENU_HEIGHT_PX,
  WORLD_GRAPH_CREATE_MENU_WIDTH_PX,
  WORLD_GRAPH_NODE_MENU_HEIGHT_PX,
  WORLD_GRAPH_NODE_MENU_WIDTH_PX,
} from "@shared/constants/worldGraphUI";
import { CustomEntityNode } from "../components/CustomEntityNode";
import { DraftBlockNode } from "../components/DraftBlockNode";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";
import { getMenuPosition } from "@renderer/features/research/utils/worldGraphUtils";
import { WorldGraphCreateMenu } from "../components/WorldGraphCreateMenu";
import { WorldGraphNodeMenu } from "./WorldGraphNodeMenu";
import { WorldGraphFloatingToolbar } from "./WorldGraphFloatingToolbar";
import { CustomEdge } from "../components/CustomEdge";
import { useSmartSnap } from "../hooks/useSmartSnap";
import { SmartSnapLines } from "../components/SmartSnapLines";
import { CanvasCommandPalette, type PaletteMode } from "./CanvasCommandPalette";
import { isEditableWorldGraphTarget } from "./worldGraphCanvasKeyboard";

// Hooks & Utils
import { computeClusterPositions } from "./utils/clusterUtils";
import { useCanvasState } from "./hooks/useCanvasState";
import { useCanvasDelete } from "./hooks/useCanvasDelete";
import { useCanvasSync } from "./hooks/useCanvasSync";

const nodeTypes = {
  draft: DraftBlockNode,
  custom: CustomEntityNode,
};

const edgeTypes = {
  customEdge: CustomEdge,
};

const WORLD_SUBTYPES = ["Place", "Concept", "Rule", "Item"] as const;

interface WorldGraphCanvasProps {
  nodes: WorldGraphNode[];
  edges: EntityRelation[];
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

export function WorldGraphCanvas({ nodes: graphNodes, edges: graphEdges }: WorldGraphCanvasProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const dialog = useDialog();
  
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const selectedEdgeId = useWorldBuildingStore((state) => state.selectedEdgeId);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);
  const createGraphNode = useWorldBuildingStore((state) => state.createGraphNode);
  const createRelation = useWorldBuildingStore((state) => state.createRelation);
  const updateGraphNodePosition = useWorldBuildingStore((state) => state.updateGraphNodePosition);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [createMenu, setCreateMenu] = useState<CreateMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);
  const [paletteMode, setPaletteMode] = useState<PaletteMode | null>(null);

  // --- 1. State Management ---
  const {
    nodes,
    setNodes,
    onNodesChange,
    edges,
    setEdges,
    onEdgesChange,
    layoutedNodes,
    graphNodeById,
    setOptimisticDeletedNodeIds,
    setOptimisticDeletedEdgeIds,
  } = useCanvasState({ graphNodes, graphEdges, selectedNodeId });

  // Useful callbacks
  const removeDraftNode = useCallback(
    (nodeId: string) => {
      setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
      if (selectedNodeId === nodeId) {
        selectNode(null);
      }
    },
    [selectNode, selectedNodeId, setNodes],
  );

  const clearMenus = useCallback(() => {
    setCreateMenu(null);
    setNodeMenu(null);
  }, []);

  // --- 2. Feature Hooks ---
  const { snapLines, snapGaps, handleNodeDrag: onSmartNodeDrag, handleNodeDragStop: onSmartNodeDragStop } = useSmartSnap(
    nodes,
    setNodes,
  );

  const { runNodeDelete, handleDeleteSelection, runRelationDelete } = useCanvasDelete({
    nodes,
    edges,
    graphNodes,
    graphEdges,
    selectedNodeId,
    selectedEdgeId,
    removeDraftNode,
    setOptimisticDeletedNodeIds,
    setOptimisticDeletedEdgeIds,
    onBeforeDelete: clearMenus,
  });

  const { spawnDraftNode } = useCanvasSync({
    activeProjectId,
    canvasRef,
    rfInstance,
    setNodes,
    removeDraftNode,
    selectNode,
    setPaletteMode,
  });

  // --- 3. Layout Trigger ---
  const layoutTrigger = useGraphIdeStore((state) => state.layoutTrigger);
  const prevTriggerVersionRef = useRef<number>(0);

  useEffect(() => {
    if (!layoutTrigger || layoutTrigger.version === prevTriggerVersionRef.current) return;
    prevTriggerVersionRef.current = layoutTrigger.version;
    if (!rfInstance) return;

    if (layoutTrigger.mode === "reset") {
      rfInstance.fitView({ duration: 500, padding: 0.15 });
    } else if (layoutTrigger.mode === "auto") {
      setNodes(layoutedNodes);
      setTimeout(() => rfInstance.fitView({ duration: 400, padding: 0.15 }), 60);
    } else if (layoutTrigger.mode === "cluster") {
      const clusterPos = computeClusterPositions(nodes);
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          position: clusterPos[n.id] ?? n.position,
        })),
      );
      setTimeout(() => rfInstance.fitView({ duration: 400, padding: 0.15 }), 60);
    }
  }, [layoutTrigger, rfInstance, layoutedNodes, nodes, setNodes]);

  // Fit View on Project Change
  const fitViewProjectIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeProjectId) {
      fitViewProjectIdRef.current = null;
      return;
    }
    if (!rfInstance || nodes.length === 0) return;
    if (fitViewProjectIdRef.current === activeProjectId) return;

    fitViewProjectIdRef.current = activeProjectId;
    requestAnimationFrame(() => {
      rfInstance.fitView({ duration: 350, padding: 0.15 });
    });
  }, [activeProjectId, nodes.length, rfInstance]);

  // --- 4. Event Handlers ---
  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      clearMenus();
      selectNode(node.id);
      if (node.type !== "draft") {
        EditorSyncBus.emit("JUMP_TO_MENTION", { entityId: node.id });
      }
    },
    [selectNode, clearMenus],
  );

  const onNodeContextMenu: NodeMouseHandler = useCallback(
    (event, node) => {
      event.preventDefault();
      event.stopPropagation();
      const { left, top } = getMenuPosition(
        canvasRef.current,
        event.clientX,
        event.clientY,
        WORLD_GRAPH_NODE_MENU_WIDTH_PX,
        WORLD_GRAPH_NODE_MENU_HEIGHT_PX,
      );
      setCreateMenu(null);
      selectNode(node.id);
      setNodeMenu({ nodeId: node.id, left, top });
    },
    [selectNode],
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      clearMenus();
      selectEdge(edge.id);
    },
    [selectEdge, clearMenus],
  );

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!rfInstance) return;
      const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      spawnDraftNode(position.x, position.y);
      clearMenus();
    },
    [rfInstance, spawnDraftNode, clearMenus],
  );

  const onFlowDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".react-flow__pane")) return;
      onPaneDoubleClick(event);
    },
    [onPaneDoubleClick],
  );

  const onPaneClick = useCallback(() => {
    clearMenus();
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge, clearMenus]);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!activeProjectId || !rfInstance) return;
      const position = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const menuPosition = getMenuPosition(
        canvasRef.current,
        event.clientX,
        event.clientY,
        WORLD_GRAPH_CREATE_MENU_WIDTH_PX,
        WORLD_GRAPH_CREATE_MENU_HEIGHT_PX,
      );
      setCreateMenu({ flowX: position.x, flowY: position.y, left: menuPosition.left, top: menuPosition.top });
      setNodeMenu(null);
    },
    [activeProjectId, rfInstance],
  );

  const handleCreateNode = useCallback(
    async (entityType: WorldEntitySourceType, customName?: string, customSubType?: string) => {
      if (!activeProjectId || !createMenu) return;
      setCreateMenu(null);
      const resolvedSubType =
        customSubType &&
        WORLD_SUBTYPES.includes(
          customSubType as (typeof WORLD_SUBTYPES)[number],
        )
          ? (customSubType as (typeof WORLD_SUBTYPES)[number])
          : entityType === "Place" ||
              entityType === "Concept" ||
              entityType === "Rule" ||
              entityType === "Item"
            ? entityType
            : undefined;
      const created = await createGraphNode({
        projectId: activeProjectId,
        entityType,
        subType: resolvedSubType,
        name: customName || t("world.graph.canvas.newEntityName", { type: t(`world.graph.entityTypes.${entityType}`, { defaultValue: entityType }) }),
        positionX: createMenu.flowX,
        positionY: createMenu.flowY,
      });
      if (!created) {
        showToast(t("world.graph.canvas.createFailed"), "error");
      }
    },
    [activeProjectId, createGraphNode, createMenu, showToast, t],
  );

  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!activeProjectId || !connection.source || !connection.target || connection.source === connection.target) {
        return;
      }

      const sourceNode = graphNodeById.get(connection.source);
      const targetNode = graphNodeById.get(connection.target);
      if (!sourceNode || !targetNode) return;

      const relation = getDefaultRelationForPair(sourceNode.entityType, targetNode.entityType) ?? "belongs_to";
      const created = await createRelation({
        projectId: activeProjectId,
        sourceId: sourceNode.id,
        sourceType: sourceNode.entityType,
        targetId: targetNode.id,
        targetType: targetNode.entityType,
        relation,
      });

      if (!created) {
        showToast(t("world.graph.canvas.invalidRelation"), "error");
      }
    },
    [activeProjectId, createRelation, graphNodeById, showToast, t],
  );

  const handleNodeDragStop: NodeDragHandler = useCallback(
    (_, node) => {
      onSmartNodeDragStop();
      if (node.type === "draft") return;
      void updateGraphNodePosition({
        id: node.id,
        positionX: node.position.x,
        positionY: node.position.y,
      });
    },
    [onSmartNodeDragStop, updateGraphNodePosition],
  );

  const handleSelectionChange = useCallback(
    (selection: { nodes: Node[]; edges: { id: string }[] }) => {
      const nextNode = selection.nodes.find((node) => node.type !== "draft") ?? selection.nodes[0];
      if (nextNode) {
        selectNode(nextNode.id);
        return;
      }
      const nextEdge = selection.edges[0];
      if (nextEdge) {
        selectEdge(nextEdge.id);
        return;
      }
      selectNode(null);
      selectEdge(null);
    },
    [selectEdge, selectNode],
  );

  const handleNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        if (node.type === "draft") {
          removeDraftNode(node.id);
          return;
        }
        if (graphNodeById.has(node.id)) {
          void runNodeDelete(node.id);
        }
      });
    },
    [graphNodeById, removeDraftNode, runNodeDelete],
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: { id: string }[]) => {
      deletedEdges.forEach((edge) => {
        void runRelationDelete(edge.id);
      });
    },
    [runRelationDelete],
  );

  const handleCanvasMouseDownCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isEditableWorldGraphTarget(event.target)) return;
    canvasRef.current?.focus();
  }, []);

  const handleCanvasKeyDownCapture = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        if (isEditableWorldGraphTarget(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
        setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: true })));
        setEdges((currentEdges) => currentEdges.map((edge) => ({ ...edge, selected: false })));
        selectEdge(null);
        selectNode(nodes[0]?.id ?? null);
        return;
      }

      if (event.key !== "Backspace" && event.key !== "Delete") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableWorldGraphTarget(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      void handleDeleteSelection();
    },
    [setNodes, setEdges, selectEdge, selectNode, nodes, handleDeleteSelection],
  );

  const handleFocusNode = useCallback(() => {
    if (!nodeMenu) return;
    selectNode(nodeMenu.nodeId);
    setNodeMenu(null);
  }, [nodeMenu, selectNode]);

  const handleDeleteNode = useCallback(async () => {
    if (!nodeMenu) return;
    const targetNode = graphNodes.find((node) => node.id === nodeMenu.nodeId);
    if (!targetNode) {
      const draftNode = nodes.find((node) => node.id === nodeMenu.nodeId);
      if (draftNode?.type === "draft") {
        removeDraftNode(draftNode.id);
      }
      setNodeMenu(null);
      return;
    }
    const confirmed = await dialog.confirm({
      title: t("world.graph.canvas.deleteNode"),
      message: t("world.graph.canvas.deleteEntityConfirm", { name: targetNode.name }),
      isDestructive: true,
    });
    if (!confirmed) return;
    setNodeMenu(null);
    await runNodeDelete(targetNode.id);
  }, [dialog, graphNodes, nodeMenu, nodes, removeDraftNode, runNodeDelete, t]);

  const isEmpty = graphNodes.length === 0;

  return (
    <div
      ref={canvasRef}
      tabIndex={0}
      style={{ width: "100%", height: "100%" }}
      className="bg-app relative outline-none"
      onMouseDownCapture={handleCanvasMouseDownCapture}
      onKeyDownCapture={handleCanvasKeyDownCapture}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onSelectionChange={handleSelectionChange}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        onConnect={handleConnect}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDrag={onSmartNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDoubleClick={onFlowDoubleClick}
        onPaneContextMenu={onPaneContextMenu}
        onInit={setRfInstance}
        minZoom={0.1}
        maxZoom={3}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnPinch
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        selectionOnDrag={true}
        panOnDrag={[1, 2]}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={["Meta", "Control"]}
        deleteKeyCode={null}
        className="react-flow-premium"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#64748B" className="opacity-[0.18]" />
        <Panel position="top-right" className="m-4">
          <WorldGraphFloatingToolbar />
        </Panel>
        <SmartSnapLines lines={snapLines} gaps={snapGaps} />
        {paletteMode && <CanvasCommandPalette mode={paletteMode} onClose={() => setPaletteMode(null)} />}
      </ReactFlow>

      {isEmpty && !createMenu && (
        <div className="pointer-events-none absolute inset-0 z-0 flex select-none flex-col items-center justify-center gap-6">
          <div className="flex items-end gap-3 opacity-[0.08]">
            {[
              { w: 140, h: 72, c: "#818cf8" },
              { w: 160, h: 88, c: "#fb7185" },
              { w: 130, h: 66, c: "#34d399" },
            ].map(({ w, h, c }, i) => (
              <div key={i} className="rounded-xl border" style={{ width: w, height: h, borderColor: c, borderTopWidth: 3, borderTopColor: c }} />
            ))}
          </div>
          <div className="text-center">
            <p className="mb-1.5 text-[15px] font-semibold text-fg/50">세계관을 시각화하세요</p>
            <p className="text-[12px] text-muted-foreground/40">캐릭터, 장소, 사건을 추가하고 연결해 이야기 구조를 한눈에 파악하세요</p>
          </div>
        </div>
      )}

      {createMenu && (
        <WorldGraphCreateMenu
          left={createMenu.left}
          top={createMenu.top}
          onCreate={(type, name, subType) => { void handleCreateNode(type, name, subType); }}
        />
      )}

      {nodeMenu && (
        <WorldGraphNodeMenu
          left={nodeMenu.left}
          top={nodeMenu.top}
          onFocus={handleFocusNode}
          onDelete={() => { void handleDeleteNode(); }}
          onJumpToMention={() => {
            if (!nodeMenu) return;
            EditorSyncBus.emit("JUMP_TO_MENTION", { entityId: nodeMenu.nodeId });
            setNodeMenu(null);
          }}
        />
      )}
    </div>
  );
}
