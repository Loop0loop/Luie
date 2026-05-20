import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@shared/types/utils";
import type { GraphNodeData } from "../../types/graph";

function PensiveNode({ data, selected }: NodeProps<GraphNodeData>) {
  const isChapter = data.type === "chapter";
  const isFocused = selected || data.isFocused;

  return (
    <div
      className={cn(
        "group relative flex items-center justify-center transition-all duration-300",
        // 챕터는 사각형(rounded-sm), 일반 엔티티는 원형(rounded-full)
        isChapter ? "rounded-sm" : "rounded-full",
        // 포커스/선택 시 액센트 색상, 미포커스 시 차분한 뮤티드 색상
        isFocused
          ? "h-3.5 w-3.5 bg-accent ring-4 ring-accent/25 shadow-sm scale-110"
          : "h-2 w-2 bg-muted hover:bg-fg hover:scale-125 border border-border/40"
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Label - Shows on hover or if selected/focused */}
      <div
        className={cn(
          "absolute top-full mt-2 whitespace-nowrap text-[10px] font-medium tracking-tight transition-opacity duration-200 pointer-events-none px-1 py-0.5 rounded bg-background/90 border border-border/20 shadow-sm",
          isFocused ? "opacity-100 text-fg" : "opacity-0 text-muted-foreground group-hover:opacity-100"
        )}
      >
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export default memo(PensiveNode);
