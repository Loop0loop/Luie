/**
 * WorldGraphCanvas - React Flow 기반 세계관 그래프 캔버스
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  MiniMap,
  useEdgesState,
  useNodesState,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
  type ReactFlowInstance,
  BackgroundVariant,
  PanOnScrollMode,
  SelectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { useTranslation } from "react-i18next";
import { useToast } from "@shared/ui/ToastContext";
import { useDialog } from "@shared/ui/useDialog";
import type { EntityRelation, WorldEntitySourceType, WorldGraphNode } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useGraphIdeStore } from "@renderer/features/research/stores/graphIdeStore";
import {
  WORLD_GRAPH_CREATE_MENU_HEIGHT_PX,
  WORLD_GRAPH_CREATE_MENU_WIDTH_PX,
  WORLD_GRAPH_MINIMAP_COLORS,
  WORLD_GRAPH_NODE_MENU_HEIGHT_PX,
  WORLD_GRAPH_NODE_MENU_WIDTH_PX,
} from "@shared/constants/worldGraphUI";
import { parseEntityDraftText } from "@renderer/features/research/utils/entityDraftUtils";
import { CustomEntityNode } from "../CustomEntityNode";
import { DraftBlockNode } from "../DraftBlockNode";
import { useWorldGraphLayout } from "@renderer/features/research/hooks/useWorldGraphLayout";
import { EditorSyncBus } from "@renderer/features/workspace/utils/EditorSyncBus";

const nodeTypes = {
  draft: DraftBlockNode,
  custom: CustomEntityNode,
};

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

import { getMenuPosition, toRFNode, toRFEdge } from "@renderer/features/research/utils/worldGraphUtils";
import { WorldGraphCreateMenu } from "../WorldGraphCreateMenu";
import { WorldGraphNodeMenu } from "./WorldGraphNodeMenu";
import { WorldGraphNavbar } from "../WorldGraphNavbar";

const CLUSTER_NODE_W = 220;
const CLUSTER_NODE_H = 120;
const CLUSTER_COLS = 3;
const CLUSTER_GAP_X = 300;
const CLUSTER_GAP_Y = 60;

function computeClusterPositions(nodes: Node[]): Record<string, { x: number; y: number }> {
  const groups = new Map<string, Node[]>();
  nodes
    .filter((n) => n.type !== "draft")
    .forEach((node) => {
      const key = (node.data?.subType ?? node.data?.entityType ?? "Unknown") as string;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(node);
    });

  const result: Record<string, { x: number; y: number }> = {};
  let groupX = 0;
  groups.forEach((groupNodes) => {
    groupNodes.forEach((node, i) => {
      const col = i % CLUSTER_COLS;
      const row = Math.floor(i / CLUSTER_COLS);
      result[node.id] = {
        x: groupX + col * CLUSTER_NODE_W,
        y: row * (CLUSTER_NODE_H + CLUSTER_GAP_Y),
      };
    });
    groupX += CLUSTER_COLS * CLUSTER_NODE_W + CLUSTER_GAP_X;
  });
  return result;
}

export function WorldGraphCanvas({ nodes: graphNodes, edges: graphEdges }: WorldGraphCanvasProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const dialog = useDialog();
  const selectedNodeId = useWorldBuildingStore((state) => state.selectedNodeId);
  const activeProjectId = useWorldBuildingStore((state) => state.activeProjectId);
  const selectNode = useWorldBuildingStore((state) => state.selectNode);
  const selectEdge = useWorldBuildingStore((state) => state.selectEdge);
  const createGraphNode = useWorldBuildingStore((state) => state.createGraphNode);
  const deleteGraphNode = useWorldBuildingStore((state) => state.deleteGraphNode);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [createMenu, setCreateMenu] = useState<CreateMenuState | null>(null);
  const [nodeMenu, setNodeMenu] = useState<NodeMenuState | null>(null);

  const layoutTrigger = useGraphIdeStore((state) => state.layoutTrigger);
  const prevTriggerVersionRef = useRef<number>(0);

  const rfNodes = useMemo(
    () => graphNodes.map((node, index) => toRFNode(node, index, selectedNodeId)),
    [graphNodes, selectedNodeId],
  );
  const rfEdges = useMemo(() => {
    const translate = (key: string, fallback: string) =>
      i18n.t(key, { defaultValue: fallback });
    const nodeById = new Map(rfNodes.map((node) => [node.id, node] as const));
    return graphEdges.map((edge) => toRFEdge(edge, translate, nodeById));
  }, [graphEdges, i18n, rfNodes]);

  const { layoutedNodes, layoutedEdges } = useWorldGraphLayout({
    nodes: rfNodes,
    edges: rfEdges,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  useEffect(() => {
    setEdges((prev) => {
      if (
        prev.length === layoutedEdges.length &&
        prev.every((edge, index) => {
          const next = layoutedEdges[index];
          return edge.id === next.id && edge.label === next.label && edge.source === next.source && edge.target === next.target;
        })
      ) {
        return prev;
      }
      return layoutedEdges;
    });
  }, [layoutedEdges, setEdges]);

  // Fix: Smart Node Synchronization
  // Keeps local node position while user drags, but accepts programmatic Layout updates
  const lastStorePositions = useRef<Record<string, { x: number; y: number }>>({});


  useEffect(() => {
    setNodes((prev) => {
      let isChanged = false;
      const prevById = new Map(prev.map((node) => [node.id, node] as const));
      const sourceRfNodesById = new Map(rfNodes.map((node) => [node.id, node] as const));
      const draftNodes = prev.filter(n => n.type === "draft");
      const nextNodes = layoutedNodes.map((layoutNode: Node) => {
        const existing = prevById.get(layoutNode.id);
        const sourceRfNode = sourceRfNodesById.get(layoutNode.id);
        const lastPos = lastStorePositions.current[layoutNode.id];

        // Remember the DB position so we know if it externally changed
        // We use sourceRfNode.position (DB) for external change tracking, not the layout position
        if (sourceRfNode) {
          lastStorePositions.current[layoutNode.id] = { x: sourceRfNode.position.x, y: sourceRfNode.position.y };
        }

        if (!existing) {
          isChanged = true;
          return layoutNode;
        }

        const dbPosChanged =
          lastPos &&
          sourceRfNode &&
          (lastPos.x !== sourceRfNode.position.x || lastPos.y !== sourceRfNode.position.y);

        const didModeSwitched = false;

        let newPos = existing.position;

        // Only override position if:
        // 1. DB explicitly changed position (another device/sync)
        // 2. User just switched viewMode (triggers auto-layout recalculation)
        if (!existing.dragging && dbPosChanged) {
          newPos = sourceRfNode!.position; // Use DB position on external changes
        } else if (!existing.dragging && didModeSwitched) {
          newPos = layoutNode.position; // Use layout position only on mode switch
        }

        const needsUpdate =
          existing.position.x !== newPos.x ||
          existing.position.y !== newPos.y ||
          existing.selected !== layoutNode.selected ||
          existing.data?.label !== layoutNode.data?.label ||
          existing.data?.subType !== layoutNode.data?.subType ||
          existing.data?.importance !== layoutNode.data?.importance;

        if (needsUpdate) {
          isChanged = true;
          return {
            ...existing,
            data: layoutNode.data,
            selected: layoutNode.selected,
            position: newPos,
          };
        }
        return existing;
      });

      if (isChanged || prev.length !== (layoutedNodes.length + draftNodes.length)) {
        return [...nextNodes, ...draftNodes];
      }
      return prev;
    });

  }, [layoutedNodes, rfNodes, setNodes]);



  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setCreateMenu(null);
      setNodeMenu(null);
      selectNode(node.id);

      // Notify editor to jump to mention
      EditorSyncBus.emit("JUMP_TO_MENTION", { entityId: node.id });
    },
    [selectNode],
  );

  // Sync with Editor
  useEffect(() => {
    const handleFocus = (payload: { entityId: string }) => {
      selectNode(payload.entityId);
      if (rfInstance) {
        const node = rfInstance.getNode(payload.entityId);
        if (node) {
          rfInstance.setCenter(node.position.x, node.position.y, { duration: 800, zoom: 1.2 });
        }
      }
    };
    EditorSyncBus.on("FOCUS_ENTITY", handleFocus);
    return () => EditorSyncBus.off("FOCUS_ENTITY", handleFocus);
  }, [rfInstance, selectNode]);

  // Layout Trigger (from sidebar buttons)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutTrigger, rfInstance]);

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

  const spawnDraftNode = useCallback((x: number, y: number, initialType?: string) => {
    if (!activeProjectId) return;
    
    // Remove existing draft nodes if any to keep UI clean
    setNodes((nds) => nds.filter((n) => n.type !== 'draft'));

    const draftId = `draft-${Date.now()}`;
    const draftNode: Node = {
      id: draftId,
      type: 'draft',
      position: { x, y },
      data: {
        id: draftId,
        initialValue: initialType ? `${initialType} ` : "",
        onConvert: async (nodeId: string, text: string) => {
          setNodes((nds) => nds.filter((n) => n.id !== nodeId));
          
          if (!text.trim() || !activeProjectId) return;
          
          const { name, entityType, subType } = parseEntityDraftText(text);
          
          try {
            await createGraphNode({
              projectId: activeProjectId,
              entityType,
              subType,
              name,
              positionX: x,
              positionY: y,
            });
          } catch (err) {
            // ignore error
            showToast("엔티티 생성에 실패했습니다.", "error");
          }
        }
      },
    };

    setNodes((nds) => nds.concat(draftNode));
  }, [activeProjectId, createGraphNode, setNodes, showToast]);

  // Quick create: places a named entity instantly at viewport center
  const handleCreateEntityAtCenter = useCallback(
    async (entityType: WorldEntitySourceType) => {
      if (!rfInstance || !activeProjectId) return;
      const viewport = rfInstance.getViewport();
      const canvasEl = canvasRef.current;
      const cx = canvasEl ? canvasEl.clientWidth / 2 : window.innerWidth / 2;
      const cy = canvasEl ? canvasEl.clientHeight / 2 : window.innerHeight / 2;
      const center = rfInstance.screenToFlowPosition({ x: cx, y: cy });
      const defaultNames: Record<WorldEntitySourceType, string> = {
        Character: "새 캐릭터", Event: "새 사건", Place: "새 장소",
        Faction: "새 세력", Concept: "새 개념", Rule: "새 규칙",
        Item: "새 아이템", Term: "새 용어", WorldEntity: "새 엔티티",
      };
      await createGraphNode({
        projectId: activeProjectId,
        entityType,
        name: defaultNames[entityType] ?? `새 ${entityType}`,
        positionX: center.x + (Math.random() - 0.5) * 80,
        positionY: center.y + (Math.random() - 0.5) * 80,
      });
      void viewport; // keep viewport ref
    },
    [rfInstance, activeProjectId, createGraphNode],
  );

  const onPaneDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      
      if (!rfInstance) return;
      
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      spawnDraftNode(position.x, position.y);
      setCreateMenu(null);
      setNodeMenu(null);
    },
    [rfInstance, spawnDraftNode],
  );

  const onFlowDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".react-flow__pane")) {
        return;
      }
      onPaneDoubleClick(event);
    },
    [onPaneDoubleClick],
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
        WORLD_GRAPH_CREATE_MENU_WIDTH_PX,
        WORLD_GRAPH_CREATE_MENU_HEIGHT_PX,
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

  const adjacentNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const adjacent = new Set<string>();
    edges.forEach((edge) => {
      if (edge.source === selectedNodeId) adjacent.add(edge.target);
      if (edge.target === selectedNodeId) adjacent.add(edge.source);
    });
    return adjacent;
  }, [edges, selectedNodeId]);

  const styledNodes = useMemo(() => {
    return nodes.map((node) => {
      let opacity = 1;

      if (selectedNodeId) {
        const isSelected = node.id === selectedNodeId;
        const isAdjacent = adjacentNodeIds.has(node.id);
        opacity = isSelected || isAdjacent ? 1 : 0.15;
      }

      if (opacity === 1 && !node.style?.opacity) return node;

      return {
        ...node,
        style: { ...node.style, opacity },
      };
    });
  }, [nodes, selectedNodeId, adjacentNodeIds]);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      let opacity = 1;
      const label = edge.label;

      if (selectedNodeId) {
        const isConnected = edge.source === selectedNodeId || edge.target === selectedNodeId;
        opacity = isConnected ? 1 : 0.15;
      }

      if (opacity === 1 && label === edge.label && !edge.style?.opacity) return edge;

      return {
        ...edge,
        label,
        style: { ...edge.style, opacity },
      };
    });
  }, [edges, selectedNodeId]);

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

  const isEmpty = graphNodes.length === 0;

  return (
    <div ref={canvasRef} style={{ width: "100%", height: "100%" }} className="bg-app relative">
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDoubleClick={onFlowDoubleClick}
        onPaneContextMenu={onPaneContextMenu}
        onInit={setRfInstance}
        fitView={nodes.length > 0}
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
        deleteKeyCode={["Backspace", "Delete"]}
        className="react-flow-premium"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#64748B"
          className="opacity-[0.18]"
        />
        <MiniMap
          nodeColor={(node) => {
            const subType = (node.data?.subType ?? node.data?.entityType ?? "WorldEntity") as string;
            return WORLD_GRAPH_MINIMAP_COLORS[subType] ?? "#94a3b8";
          }}
          maskColor="rgba(0,0,0,0.25)"
          style={{
            bottom: 88,
            right: 16,
            width: 140,
            height: 90,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(13,13,15,0.80)",
          }}
        />
      </ReactFlow>

      {isEmpty && !createMenu && (
        <div className="pointer-events-none absolute inset-0 z-0 flex select-none flex-col items-center justify-center gap-6">
          {/* Ghost node preview */}
          <div className="flex items-end gap-3 opacity-[0.08]">
            {[
              { w: 140, h: 72, c: "#818cf8" },
              { w: 160, h: 88, c: "#fb7185" },
              { w: 130, h: 66, c: "#34d399" },
            ].map(({ w, h, c }, i) => (
              <div
                key={i}
                className="rounded-xl border"
                style={{ width: w, height: h, borderColor: c, borderTopWidth: 3, borderTopColor: c }}
              />
            ))}
          </div>

          <div className="text-center">
            <p className="mb-1.5 text-[15px] font-semibold text-fg/50">
              세계관을 시각화하세요
            </p>
            <p className="text-[12px] text-muted-foreground/40">
              캐릭터, 장소, 사건을 추가하고 연결해 이야기 구조를 한눈에 파악하세요
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-element/30 px-4 py-2 text-[11px] text-muted-foreground/50 backdrop-blur-md">
            <span>
              <kbd className="rounded border border-border/50 bg-app/60 px-1.5 py-0.5 text-[10px]">더블클릭</kbd>{" "}
              빈 블록
            </span>
            <div className="h-3 w-px bg-border/40" />
            <span>
              <kbd className="rounded border border-border/50 bg-app/60 px-1.5 py-0.5 text-[10px]">우클릭</kbd>{" "}
              엔티티 생성
            </span>
            <div className="h-3 w-px bg-border/40" />
            <span>
              <kbd className="rounded border border-border/50 bg-app/60 px-1.5 py-0.5 text-[10px]">드래그</kbd>{" "}
              이동
            </span>
          </div>
        </div>
      )}

      {createMenu && (
        <WorldGraphCreateMenu 
          left={createMenu.left}
          top={createMenu.top}
          onCreate={(type) => { void handleCreateNode(type); }}
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

      {/* Canvas Navbar (Obsidian style) */}
      <WorldGraphNavbar
        onSpawnDraft={(type) => {
          if (!rfInstance) return;
          const canvasEl = canvasRef.current;
          const cx = canvasEl ? canvasEl.clientWidth / 2 : window.innerWidth / 2;
          const cy = canvasEl ? canvasEl.clientHeight / 2 : window.innerHeight / 2;
          const center = rfInstance.screenToFlowPosition({ x: cx, y: cy });
          spawnDraftNode(center.x, center.y, type);
        }}
        onCreateEntity={(entityType) => { void handleCreateEntityAtCenter(entityType); }}
        onFitView={() => rfInstance?.fitView({ duration: 450, padding: 0.15 })}
        onZoomIn={() => rfInstance?.zoomIn({ duration: 200 })}
        onZoomOut={() => rfInstance?.zoomOut({ duration: 200 })}
      />
    </div>
  );
}
