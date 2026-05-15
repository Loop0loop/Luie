import { memo } from "react";
import type { NodeProps } from "reactflow";
import { BaseCanvasNode } from "./BaseCanvasNode";
import type { CanvasNodeData } from "./nodeData";

/** 사건 노드 */
function EventNodeImpl(props: NodeProps<CanvasNodeData>) {
  return <BaseCanvasNode {...props} />;
}

export const EventNode = memo(EventNodeImpl);
