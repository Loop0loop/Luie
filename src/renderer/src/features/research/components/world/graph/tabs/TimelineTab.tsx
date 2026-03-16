import { useWorldGraphWorkspace } from "../hooks/useWorldGraphWorkspace";
import { TimelineView } from "../views/TimelineView";

type TimelineTabProps = {
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
};

export function TimelineTab({
  selectedNodeId,
  onSelectNode,
}: TimelineTabProps) {
  const { timelineNodes } = useWorldGraphWorkspace();

  return (
    <TimelineView
      events={timelineNodes}
      selectedNodeId={selectedNodeId}
      onSelectNode={onSelectNode}
    />
  );
}
