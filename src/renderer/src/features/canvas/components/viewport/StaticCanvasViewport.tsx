/**
 * StaticCanvasViewport — 정적 세계관 설계 캔버스 (UI/UX 밑작업).
 *
 * 특징:
 *   - 프로젝트 전체 엔티티 표시 (scope 무관)
 *   - 노드 드래그 가능 (nodesDraggable={true}) — 저장 로직은 추후 연결
 *   - 우측 세로 툴바: 설정 / 줌인 / 리셋 / 핏뷰 / 줌아웃 / 실행취소 / 다시실행 / 도움말
 *   - 하단 중앙 생성 툴바: 빈 노드 / 텍스트 노드 / 미디어 노드
 *   - React-Flow 기본 Controls 제거 (우측 툴바로 대체)
 *
 * 저장/편집 기능은 추후 단계에서 연결.
 */

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  PanOnScrollMode,
  type Node,
  type OnSelectionChangeParams,
  useReactFlow,
} from "reactflow";
import {
  Settings,
  ZoomIn,
  RotateCcw,
  Maximize2,
  Minus,
  Undo2,
  Redo2,
  HelpCircle,
  FileText,
  Image,
  File,
  MoreHorizontal,
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
import {
  buildFlowGraph,
  CANVAS_NODE_KIND_COLOUR,
  type CanvasNodeKind,
} from "../../types";
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

const FALLBACK_MINIMAP_COLOUR = "var(--bg-element)";

function getMiniMapNodeColour(node: Node): string {
  const data = node.data as { kind?: CanvasNodeKind } | undefined;
  if (!data?.kind) return FALLBACK_MINIMAP_COLOUR;
  return CANVAS_NODE_KIND_COLOUR[data.kind] ?? FALLBACK_MINIMAP_COLOUR;
}

// ─── Right toolbar ────────────────────────────────────────────────────────────

function RightToolbar() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();

  const btnClass =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 bg-panel text-muted transition-colors hover:bg-surface-hover hover:text-fg";

  return (
    <div
      className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-xl border border-border/30 bg-panel/90 p-1.5 shadow-panel backdrop-blur-sm"
      data-testid="canvas-right-toolbar"
    >
      {/* ··· 핸들 */}
      <div className="mb-0.5 flex items-center justify-center">
        <MoreHorizontal className="h-3 w-3 text-muted/50" aria-hidden />
      </div>

      {/* 설정 */}
      <button
        type="button"
        title={t("canvas.toolbar.settings")}
        className={btnClass}
        onClick={() => undefined}
      >
        <Settings className="h-4 w-4" />
      </button>

      <div className="my-0.5 h-px w-6 bg-border/40" aria-hidden />

      {/* 줌인 */}
      <button
        type="button"
        title={t("canvas.toolbar.zoomIn")}
        className={btnClass}
        onClick={() => zoomIn({ duration: 200 })}
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      {/* 리셋 줌 */}
      <button
        type="button"
        title={t("canvas.toolbar.resetZoom")}
        className={btnClass}
        onClick={() => zoomTo(1, { duration: 200 })}
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* 핏뷰 */}
      <button
        type="button"
        title={t("canvas.toolbar.fitView")}
        className={btnClass}
        onClick={() => fitView({ padding: CANVAS_FIT_VIEW_PADDING, duration: 300 })}
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* 줌아웃 */}
      <button
        type="button"
        title={t("canvas.toolbar.zoomOut")}
        className={btnClass}
        onClick={() => zoomOut({ duration: 200 })}
      >
        <Minus className="h-4 w-4" />
      </button>

      <div className="my-0.5 h-px w-6 bg-border/40" aria-hidden />

      {/* 실행취소 (UI only) */}
      <button
        type="button"
        title={t("canvas.toolbar.undo")}
        className={cn(btnClass, "opacity-40 cursor-not-allowed")}
        disabled
      >
        <Undo2 className="h-4 w-4" />
      </button>

      {/* 다시실행 (UI only) */}
      <button
        type="button"
        title={t("canvas.toolbar.redo")}
        className={cn(btnClass, "opacity-40 cursor-not-allowed")}
        disabled
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <div className="my-0.5 h-px w-6 bg-border/40" aria-hidden />

      {/* 도움말 */}
      <button
        type="button"
        title={t("canvas.toolbar.help")}
        className={btnClass}
        onClick={() => undefined}
      >
        <HelpCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Bottom create toolbar ────────────────────────────────────────────────────

function BottomCreateToolbar() {
  const { t } = useTranslation();

  const createItems = [
    {
      icon: <File className="h-7 w-7" />,
      label: t("canvas.create.blank"),
      onClick: () => undefined,
    },
    {
      icon: <FileText className="h-7 w-7" />,
      label: t("canvas.create.text"),
      onClick: () => undefined,
    },
    {
      icon: <Image className="h-7 w-7" />,
      label: t("canvas.create.media"),
      onClick: () => undefined,
    },
  ] as const;

  return (
    <div
      className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
      data-testid="canvas-create-toolbar"
    >
      <div className="flex items-center gap-1 rounded-xl border border-border/30 bg-panel/90 p-2 shadow-panel backdrop-blur-sm">
        {createItems.map((item) => (
          <button
            key={item.label}
            type="button"
            title={item.label}
            onClick={item.onClick}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-border/40 bg-element text-muted transition-all hover:border-accent/40 hover:bg-surface-hover hover:text-fg"
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

  // 정적 모드: scope 없이 프로젝트 전체 엔티티 표시
  // whole-project scope를 임시로 사용 (projectId는 빈 문자열 — 필터 없음)
  const projection = useMemo(
    () =>
      buildProjection(
        graphData,
        "flow-map",
        graphData
          ? { kind: "whole-project", projectId: "" }
          : null,
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

        <MiniMap
          nodeColor={getMiniMapNodeColour}
          maskColor="var(--bg-canvas)"
          className="border-border! bg-panel! shadow-panel!"
          style={{ background: "var(--bg-panel)" }}
        />

        {/* React-Flow Controls 제거 — 우측 툴바로 대체 */}
      </ReactFlow>

      {/* 우측 세로 툴바 */}
      <RightToolbar />

      {/* 하단 중앙 생성 툴바 */}
      <BottomCreateToolbar />
    </div>
  );
}
