import { memo } from "react";
import type { NodeProps } from "reactflow";
import { BaseCanvasNode } from "./BaseCanvasNode";
import type { CanvasNodeData } from "./nodeData";

/** 인물 노드 */
function CharacterNodeImpl(props: NodeProps<CanvasNodeData>) {
  return <BaseCanvasNode {...props} />;
}

export const CharacterNode = memo(CharacterNodeImpl);
