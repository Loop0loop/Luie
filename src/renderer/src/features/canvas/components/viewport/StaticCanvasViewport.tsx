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
  useReactFlow,
} from "reactflow";
import {
  File,
  FileText,
  HelpCircle,
  Image,
  Maximize2,
  Minus,
  MoreHorizontal,
  Redo2,
  RotateCcw,
  Settings,
  Undo2,
  ZoomIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import {
  CANVAS_FIT_VIEW_PADDING,
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
  CANVAS_ZOOM_MAX,
  CANVAS_ZOOM_MIN,
} from "@shared/constants/canvasSizing";
import { cn } from "@shared/types/utils";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { useCanvasViewStore } from "../../stores";
import { buildFlowGraph } from "../../types";
import { buildProjection } from "../../types/canvasProjectionAdapter";
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

// ─── Right floating toolbar (Obsidian-style, vertical center) ────────────────

const TOOLBAR_BTN_BASE =
  "flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-fg";

const TOOLBAR_DIVIDER = "my-1 h-px w-4 bg-border/40";

function RightToolbar() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();

  return (
    <div
      className="pointer-events-auto absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-lg border border-border/40 bg-panel/95 p-1 shadow-panel backdrop-blur-sm"
      data-testid="canvas-right-toolbar"
    >
      {/* 핸들 (드래그 그립 — 추후 위치 조정 기능용) */}
      <div className="flex h-3 items-center justify-center" aria-hidden>
        <MoreHorizontal className="h-3 w-3 text-muted/40" />
      </div>

      {/* 설정 */}
      <button
        type="button"
        title={t("canvas.toolbar.settings")}
        className={TOOLBAR_BTN_BASE}
        onClick={() => undefined}
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      <div className={TOOLBAR_DIVIDER} aria-hidden />

      {/* 줌인 */}
      <button
        type="button"
        title={t("canvas.toolbar.zoomIn")}
        className={TOOLBAR_BTN_BASE}
        onClick={() => zoomIn({ duration: 200 })}
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </button>

      {/* 줌 리셋 */}
      <button
        type="button"
        title={t("canvas.toolbar.resetZoom")}
        className={TOOLBAR_BTN_BASE}
        onClick={() => zoomTo(1, { duration: 200 })}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>

      {/* 핏 뷰 */}
      <button
        type="button"
        title={t("canvas.toolbar.fitView")}
        className={TOOLBAR_BTN_BASE}
        onClick={() =>
          fitView({ padding: CANVAS_FIT_VIEW_PADDING, duration: 300 })
        }
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* 줌 아웃 */}
      <button
        type="button"
        title={t("canvas.toolbar.zoomOut")}
        className={TOOLBAR_BTN_BASE}
        onClick={() => zoomOut({ duration: 200 })}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <div className={TOOLBAR_DIVIDER} aria-hidden />

      {/* Undo / Redo (UI only) */}
      <button
        type="button"
        title={t("canvas.toolbar.undo")}
        className={cn(TOOLBAR_BTN_BASE, "cursor-not-allowed opacity-40")}
        disabled
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title={t("canvas.toolbar.redo")}
        className={cn(TOOLBAR_BTN_BASE, "cursor-not-allowed opacity-40")}
        disabled
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>

      <div className={TOOLBAR_DIVIDER} aria-hidden />

      {/* 도움말 */}
      <button
        type="button"
        title={t("canvas.toolbar.help")}
        className={TOOLBAR_BTN_BASE}
        onClick={() => undefined}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Bottom create toolbar (Obsidian-style, 3 slots) ─────────────────────────

const CREATE_BTN_BASE =
  "flex h-11 w-11 items-center justify-center rounded-md border border-border/40 bg-element text-muted transition-all hover:border-accent/40 hover:bg-surface-hover hover:text-fg";

function BottomCreateToolbar() {
  const { t } = useTranslation();

  const items = [
    {
      key: "blank",
      icon: <File className="h-5 w-5" />,
      label: t("canvas.create.blank"),
    },
    {
      key: "text",
      icon: <FileText className="h-5 w-5" />,
      label: t("canvas.create.text"),
    },
    {
      key: "media",
      icon: <Image className="h-5 w-5" />,
      label: t("canvas.create.media"),
    },
  ] as const;

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
      data-testid="canvas-create-toolbar"
    >
      <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-panel/95 p-1.5 shadow-panel backdrop-blur-sm">
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
        <RightToolbar />
      </ReactFlow>

      {/* useReactFlow() 미사용이므로 외부 가능 */}
      <BottomCreateToolbar />
    </div>
  );
}
