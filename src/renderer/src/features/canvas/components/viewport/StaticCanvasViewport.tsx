/**
 * StaticCanvasViewport — 정적 세계관 설계 캔버스 (UI/UX 밑작업).
 *
 * SRP:
 *   - 데이터: useStaticProjection()
 *   - 선택 상태: useCanvasSelection()
 *   - 렌더링: ReactFlow + CanvasFloatingToolbar + BottomCreateToolbar
 *   - BottomCreateToolbar 는 별도 파일로 분리됩니다.
 */

import { useMemo } from "react";
import {
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
} from "@shared/constants/canvasSizing";
import { useStaticProjection } from "../../hooks/useStaticProjection";
import { CanvasFloatingToolbar } from "./CanvasFloatingToolbar";
import { BottomCreateToolbar } from "./BottomCreateToolbar";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityNode } from "./nodes/EntityNode";
import BaseCanvasViewport from "./BaseCanvasViewport";

// ─── static type maps ─────────────────────────────────────────────────────────

const NODE_TYPES = {
  [CANVAS_RF_NODE_TYPE_ENTITY]: EntityNode,
} as const;

const EDGE_TYPES = {
  [CANVAS_RF_EDGE_TYPE_RELATION]: RelationEdge,
} as const;

// ─── component ────────────────────────────────────────────────────────────────

export default function StaticCanvasViewport() {
  const projection = useStaticProjection();
  const nodeTypes = useMemo(() => NODE_TYPES, []);
  const edgeTypes = useMemo(() => EDGE_TYPES, []);

  return (
    <BaseCanvasViewport
      projection={projection}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={true}
      extraChildren={<CanvasFloatingToolbar />}
      bottomToolbar={<BottomCreateToolbar />}
      wrapperClassName="relative h-full w-full"
      dataTestId="canvas-static-viewport"
    />
  );
}
