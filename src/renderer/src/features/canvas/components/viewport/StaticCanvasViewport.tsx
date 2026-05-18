/**
 * StaticCanvasViewport — 정적 세계관 설계 캔버스 (UI/UX 밑작업).
 *
 * Obsidian Canvas 스타일:
 *   - 미니맵 없음 (Obsidian Canvas는 미니맵 미제공)
 *   - 우측 세로 플로팅 툴바 (수직 중앙)
 *   - 하단 중앙 노드 생성 툴바 (3 슬롯)
 *   - 미니멀한 외곽선/아이콘
 *
 * 동작:
 *   - 노드 드래그 가능 (저장 로직은 추후 연결)
 *   - 새 노드 추가 / 엣지 연결 / 삭제: 비활성 (UI shell only)
 */

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  PanOnScrollMode,
  type OnSelectionChangeParams,
} from "reactflow";
import {
  File,
  FileText,
  Image,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import {
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
  CANVAS_FIT_VIEW_PADDING,
} from "@shared/constants/canvasSizing";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useCanvasViewStore } from "../../stores";
import { buildFlowGraph } from "../../types";
import { buildProjection } from "../../types/canvasProjectionAdapter";
import { CanvasFloatingToolbar } from "./CanvasFloatingToolbar";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityNode } from "./nodes/EntityNode";

// ─── static type maps ─────────────────────────────────────────────────────────

const NODE_TYPES = {
  [CANVAS_RF_NODE_TYPE_ENTITY]: EntityNode,
} as const;

const EDGE_TYPES = {
  [CANVAS_RF_EDGE_TYPE_RELATION]: RelationEdge,
} as const;

const DEFAULT_EDGE_OPTIONS = {
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
} as const;

const FIT_VIEW_OPTIONS = { padding: CANVAS_FIT_VIEW_PADDING } as const;

// ─── Bottom create toolbar ────────────────────────────────────────────────────

const CREATE_BTN_BASE =
  "flex h-8 w-8 items-center justify-center rounded-md border border-border/40 bg-element text-muted transition-all hover:border-accent/40 hover:bg-surface-hover hover:text-fg";

function BottomCreateToolbar() {
  const { t } = useTranslation();

  const items = [
    {
      key: "blank",
      icon: <File className="h-4 w-4" />,
      label: t("canvas.create.blank"),
    },
    {
      key: "text",
      icon: <FileText className="h-4 w-4" />,
      label: t("canvas.create.text"),
    },
    {
      key: "media",
      icon: <Image className="h-4 w-4" />,
      label: t("canvas.create.media"),
    },
  ] as const;

  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2"
      data-testid="canvas-create-toolbar"
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border/40 bg-panel/95 p-1 shadow-panel backdrop-blur-sm">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            title={item.label}
            onClick={() => undefined}
            className={CREATE_BTN_BASE}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function StaticCanvasViewport() {
  const { selection, selectNode, clearSelection } = useCanvasViewStore(
    useShallow((state) => ({
      selection: state.selection,
      selectNode: state.selectNode,
      clearSelection: state.clearSelection,
    })),
  );

  const graphData = useWorldBuildingStore((state) => state.graphData);

  const selectedNodeId = selection.kind === "node" ? selection.id : null;

  const projection = useMemo(
    () =>
      buildProjection(
        graphData,
        "flow-map",
        graphData ? { kind: "whole-project", projectId: "" } : null,
      ),
    [graphData],
  );

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(projection, selectedNodeId),
    [projection, selectedNodeId],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      if (selectedNodes.length === 1 && selectedNodes[0]) {
        selectNode(selectedNodes[0].id);
      } else if (selectedNodes.length === 0) {
        clearSelection();
      }
    },
    [selectNode, clearSelection],
  );

  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div className="relative h-full w-full" data-testid="canvas-static-viewport">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        minZoom={CANVAS_ZOOM_MIN}
        maxZoom={CANVAS_ZOOM_MAX}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        multiSelectionKeyCode="Shift"
        selectionKeyCode="Shift"
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        className="bg-canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="var(--border-default)"
          className="opacity-40"
        />

        {/* useReactFlow()를 쓰므로 반드시 <ReactFlow> 내부에 위치 */}
        <CanvasFloatingToolbar />
      </ReactFlow>

      {/* useReactFlow() 미사용이므로 외부 가능 */}
      <BottomCreateToolbar />
    </div>
  );
}
