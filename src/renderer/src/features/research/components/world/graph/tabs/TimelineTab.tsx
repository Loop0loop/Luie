import type { WorldGraphNode } from "@shared/types";
import { TimelineView } from "../views/TimelineView";

type TimelineTabProps = {
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

export function TimelineTab({
  timelineNodes,
  selectedNodeId,
  onSelectNode,
}: TimelineTabProps) {
  return (
    <TimelineView
      events={timelineNodes}
      selectedNodeId={selectedNodeId}
      onSelectNode={onSelectNode}
    />
  );
}
