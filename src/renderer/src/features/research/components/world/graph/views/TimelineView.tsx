import { useMemo } from "react";
import { Layout } from "lucide-react";
import type { WorldGraphNode, WorldTimelineTrack } from "@shared/types";
import { Card } from "@renderer/components/ui/card";
import { cn } from "@renderer/lib/utils";

export type TimelineEventAttributesPatch = {
  timelineId?: string | null;
  segmentId?: string | null;
  date?: string | null;
  time?: string | null;
};

type TimelineViewProps = {
  timelines: WorldTimelineTrack[];
  events: WorldGraphNode[];
  selectedNodeId: string | null;
  selectedTimelineId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateTimelines: (timelines: WorldTimelineTrack[]) => void;
  onUpdateEvent: (id: string, attributes: TimelineEventAttributesPatch) => void;
};

type TimelineEventAttributes = {
  timelineId?: string | null;
  segmentId?: string | null;
  date?: string | null;
  time?: string | null;
};

const readTimelineAttributes = (
  node: WorldGraphNode,
): TimelineEventAttributes => {
  if (!node.attributes || typeof node.attributes !== "object") {
    return {};
  }

  const record = node.attributes as Record<string, unknown>;

  return {
    timelineId:
      typeof record.timelineId === "string" || record.timelineId === null
        ? record.timelineId
        : undefined,
    segmentId:
      typeof record.segmentId === "string" || record.segmentId === null
        ? record.segmentId
        : undefined,
    date:
      typeof record.date === "string" || record.date === null
        ? record.date
        : undefined,
    time:
      typeof record.time === "string" || record.time === null
        ? record.time
        : undefined,
  };
};

const readEventDate = (node: WorldGraphNode): string => {
  const attr = readTimelineAttributes(node);
  return typeof attr?.date === "string"
    ? attr.date
    : typeof attr?.time === "string"
      ? attr.time
      : "날짜 미정";
};

export function TimelineView({
  timelines,
  events,
  selectedNodeId,
  selectedTimelineId,
  onSelectNode,
  onUpdateEvent,
}: TimelineViewProps) {
  const currentTimeline = useMemo(
    () => timelines.find((t) => t.id === selectedTimelineId),
    [timelines, selectedTimelineId],
  );

  const groupedEvents = useMemo(() => {
    const groups: Record<string, WorldGraphNode[]> = { unassigned: [] };

    // Initialize groups for segments
    currentTimeline?.segments.forEach((seg) => {
      groups[seg.id] = [];
    });

    events.forEach((event) => {
      const attr = readTimelineAttributes(event);
      if (
        attr?.timelineId === selectedTimelineId &&
        attr?.segmentId &&
        groups[attr.segmentId]
      ) {
        groups[attr.segmentId].push(event);
      } else {
        // If it belongs to this timeline but no segment, or no timeline at all
        // Only show if it's either explicitly this timeline or no timeline
        if (!attr?.timelineId || attr.timelineId === selectedTimelineId) {
          groups["unassigned"].push(event);
        }
      }
    });

    // Sort within groups by date
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) =>
        readEventDate(a).localeCompare(readEventDate(b)),
      );
    });

    return groups;
  }, [events, currentTimeline, selectedTimelineId]);

  if (!selectedTimelineId) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center text-sm text-fg/65">
          왼쪽 사이드바에서 타임라인 트랙을 선택하거나 새로 만들어주세요.
        </div>
      </div>
    );
  }

  const renderEventCard = (event: WorldGraphNode) => {
    const active = event.id === selectedNodeId;
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => onSelectNode(event.id)}
        className="relative flex w-full items-start gap-4 text-left group/event"
      >
        <div className="mt-4 flex flex-col items-center">
          <div
            className={cn(
              "w-3 h-3 rounded-full border-2 bg-background z-10 transition-all",
              active
                ? "border-amber-400 scale-125 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                : "border-white/10 group-hover/event:border-white/30",
            )}
          />
        </div>

        <Card
          className={cn(
            "flex-1 rounded-2xl border transition-all duration-200 bg-[#161a21]/50 backdrop-blur-sm",
            active
              ? "border-amber-400/40 bg-amber-400/5 shadow-lg shadow-amber-900/10"
              : "border-white/5 hover:border-white/10 hover:bg-white/[0.02]",
          )}
        >
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-black text-amber-400/60 tracking-wider uppercase">
                {readEventDate(event)}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover/event:opacity-100 transition-opacity">
                <select
                  className="bg-[#0b0e13] border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-fg/50 outline-none"
                  value={readTimelineAttributes(event).segmentId || ""}
                  onChange={(e) =>
                    onUpdateEvent(event.id, {
                      timelineId: selectedTimelineId,
                      segmentId: e.target.value || null,
                    })
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="">이동...</option>
                  {currentTimeline?.segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <h3 className="text-[14px] font-bold text-fg/90">{event.name}</h3>
            {event.description && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-fg/50 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </Card>
      </button>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-canvas scrollbar-hide">
      <div className="max-w-3xl mx-auto py-12 px-12">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Layout className="w-5 h-5 text-amber-400" />
            <h1 className="text-2xl font-black tracking-tight text-fg">
              {currentTimeline?.name}
            </h1>
          </div>
          <p className="text-sm text-fg/40 font-medium">
            분계점을 기준으로 사건을 정리합니다.
          </p>
        </header>

        <div className="space-y-16 relative">
          <div className="absolute left-[5px] top-4 bottom-4 w-px bg-gradient-to-b from-amber-400/20 via-white/5 to-transparent" />

          {currentTimeline?.segments.map((segment) => (
            <section key={segment.id} className="relative">
              <div className="flex items-center gap-4 mb-6 -ml-1">
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-amber-400/80 bg-amber-400/10 px-2.5 py-1 rounded-md">
                  {segment.name}
                </h2>
              </div>

              <div className="ml-8 space-y-4">
                {groupedEvents[segment.id].length === 0 && (
                  <p className="text-[11px] text-fg/20 italic ml-4">
                    이 분계점에 할당된 사건이 없습니다.
                  </p>
                )}
                {groupedEvents[segment.id].map(renderEventCard)}
              </div>
            </section>
          ))}

          {groupedEvents["unassigned"].length > 0 && (
            <section className="relative">
              <div className="flex items-center gap-4 mb-6 -ml-1">
                <div className="w-3 h-3 rounded-full border-2 border-white/10 bg-background" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-fg/30 px-2.5 py-1">
                  미분류 사건
                </h2>
              </div>

              <div className="ml-8 space-y-4">
                {groupedEvents["unassigned"].map(renderEventCard)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
