import { memo } from "react";
import type { NodeProps } from "reactflow";
import { BaseCanvasNode } from "./BaseCanvasNode";
import type { CanvasNodeData } from "./nodeData";

/**
 * 회차 노드. 카드 구조는 BaseCanvasNode와 동일.
 * data.subtitle에 회차 번호/요약을 담는다.
 */
function EpisodeNodeImpl(props: NodeProps<CanvasNodeData>) {
  return <BaseCanvasNode {...props} />;
}

export const EpisodeNode = memo(EpisodeNodeImpl);
