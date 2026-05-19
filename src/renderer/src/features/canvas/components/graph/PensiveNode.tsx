import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@shared/types/utils";
import type { GraphNodeData } from "../../types/graph";

function PensiveNode({ data, selected }: NodeProps<GraphNodeData>) {
  return (
    <div
      className={cn(
        "group relative flex items-center justify-center rounded-full transition-all duration-300",
        selected || data.isFocused ? "h-4 w-4 bg-accent" : "h-2 w-2 bg-muted-foreground hover:bg-fg hover:scale-125"
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Label - Shows on hover or if selected/focused */}
      <div
        className={cn(
          "absolute top-full mt-1.5 whitespace-nowrap text-[10px] font-medium tracking-wide transition-opacity",
          selected || data.isFocused ? "opacity-100 text-fg" : "opacity-0 text-muted-foreground group-hover:opacity-100"
        )}
      >
        {data.label}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

export default memo(PensiveNode);
