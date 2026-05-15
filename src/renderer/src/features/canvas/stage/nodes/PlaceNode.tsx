import { memo } from "react";
import type { NodeProps } from "reactflow";
import { BaseCanvasNode } from "./BaseCanvasNode";
import type { CanvasNodeData } from "./nodeData";

/** 장소 노드 */
function PlaceNodeImpl(props: NodeProps<CanvasNodeData>) {
  return <BaseCanvasNode {...props} />;
}

export const PlaceNode = memo(PlaceNodeImpl);
