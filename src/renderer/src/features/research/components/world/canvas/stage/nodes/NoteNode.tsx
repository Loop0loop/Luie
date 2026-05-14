import { memo } from "react";
import type { NodeProps } from "reactflow";
import { BaseCanvasNode } from "./BaseCanvasNode";
import type { CanvasNodeData } from "./nodeData";

/**
 * 메모 노드. 다른 노드와 달리 본문 텍스트(excerpt)를 카드 안에 표시.
 */
function NoteNodeImpl(props: NodeProps<CanvasNodeData>) {
  const excerpt = props.data.excerpt;
  return (
    <BaseCanvasNode
      {...props}
      bodySlot={
        excerpt ? (
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
            {excerpt}
          </p>
        ) : undefined
      }
    />
  );
}

export const NoteNode = memo(NoteNodeImpl);
