import type { WorldGraphNode, WorldTimelineTrack } from "@shared/types";
import { TimelineView } from "../views/TimelineView";

type TimelineTabProps = {
  timelines: WorldTimelineTrack[];
  timelineNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  selectedTimelineId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateTimelines: (timelines: WorldTimelineTrack[]) => void;
  onUpdateEvent: (id: string, attributes: Record<string, any>) => void;
};

export function TimelineTab({
  timelines,
  timelineNodes,
  selectedNodeId,
  selectedTimelineId,
  onSelectNode,
  onUpdateTimelines,
  onUpdateEvent,
}: TimelineTabProps) {
  return (
    <TimelineView
      timelines={timelines}
      events={timelineNodes}
      selectedNodeId={selectedNodeId}
      selectedTimelineId={selectedTimelineId}
      onSelectNode={onSelectNode}
      onUpdateTimelines={onUpdateTimelines}
      onUpdateEvent={onUpdateEvent}
    />
  );
}
