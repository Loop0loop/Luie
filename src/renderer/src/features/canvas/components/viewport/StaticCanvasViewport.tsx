import {
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
} from "@renderer/shared/constants/canvasSizing";
import type { CanvasProjection } from "../../types/canvasProjection.types";
import { RelationEdge } from "./edges/RelationEdge";
import { EntityNode } from "./nodes/EntityNode";
import BaseCanvasViewport from "./BaseCanvasViewport";

const NODE_TYPES = {
  [CANVAS_RF_NODE_TYPE_ENTITY]: EntityNode,
} as const;

const EDGE_TYPES = {
  [CANVAS_RF_EDGE_TYPE_RELATION]: RelationEdge,
} as const;

interface StaticCanvasViewportProps {
  /**
   * projection은 호출자가 만들어 넘긴다. 여기서 `useStaticProjection`을 다시 부르면
   * CanvasPane과 같은 store 구독·변환이 한 번 더 돌아 매 graphData 갱신마다 두 번
   * 계산된다.
   */
  projection: CanvasProjection;
}

export default function StaticCanvasViewport({
  projection,
}: StaticCanvasViewportProps) {
  return (
    <BaseCanvasViewport
      projection={projection}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      nodesDraggable={true}
      extraChildren={null}
      bottomToolbar={null}
      wrapperClassName="relative h-full w-full"
      dataTestId="canvas-static-viewport"
    />
  );
}
