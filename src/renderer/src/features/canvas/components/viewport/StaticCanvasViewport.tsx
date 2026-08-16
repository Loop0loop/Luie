import {
  CANVAS_RF_EDGE_TYPE_RELATION,
  CANVAS_RF_NODE_TYPE_ENTITY,
} from "@renderer/shared/constants/canvasSizing";
import { useStaticProjection } from "../../hooks/useStaticProjection";
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
  /** 생략하면 자체적으로 static projection을 구독한다. */
  projection?: CanvasProjection;
}

export default function StaticCanvasViewport({
  projection: injectedProjection,
}: StaticCanvasViewportProps = {}) {
  const fallbackProjection = useStaticProjection();
  const projection = injectedProjection ?? fallbackProjection;

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
