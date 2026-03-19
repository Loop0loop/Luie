import { Clock, Layout, Plus, PlusCircle, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { Input } from "@renderer/components/ui/input";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import type { WorldTimelineTrack } from "@shared/types";
import { SidebarItem, SidebarSection } from "./SidebarPrimitives";

export function TimelineSidebar({
  timelines,
  selectedTimelineId,
  onSelectTimeline,
  onUpdateTimelines,
}: {
  timelines: WorldTimelineTrack[];
  selectedTimelineId: string | null;
  onSelectTimeline: (id: string) => void;
  onUpdateTimelines: (timelines: WorldTimelineTrack[]) => void;
}) {
  const { t } = useTranslation();

  const handleAddTimeline = () => {
    const id = `timeline-${Date.now()}`;
    const nextTimelines = [
      ...timelines,
      {
        id,
        name: t("research.graph.sidebar.timeline.defaultName"),
        segments: [],
      },
    ];
    onUpdateTimelines(nextTimelines);
    onSelectTimeline(id);
  };

  const handleAddSegment = (timelineId: string) => {
    const nextTimelines = timelines.map((tLine) => {
      if (tLine.id !== timelineId) return tLine;
      return {
        ...tLine,
        segments: [
          ...tLine.segments,
          {
            id: `segment-${Date.now()}`,
            name: t("research.graph.sidebar.timeline.defaultSegmentName"),
          },
        ],
      };
    });
    onUpdateTimelines(nextTimelines);
  };

  const handleRenameTimeline = (id: string, name: string) => {
    onUpdateTimelines(
      timelines.map((tLine) => (tLine.id === id ? { ...tLine, name } : tLine)),
    );
  };

  const handleRenameSegment = (
    timelineId: string,
    segmentId: string,
    name: string,
  ) => {
    onUpdateTimelines(
      timelines.map((tLine) => {
        if (tLine.id !== timelineId) return tLine;
        return {
          ...tLine,
          segments: tLine.segments.map((segment) =>
            segment.id === segmentId ? { ...segment, name } : segment,
          ),
        };
      }),
    );
  };

  const handleDeleteTimeline = (id: string) => {
    onUpdateTimelines(timelines.filter((timeline) => timeline.id !== id));
  };

  const handleDeleteSegment = (timelineId: string, segmentId: string) => {
    onUpdateTimelines(
      timelines.map((timeline) => {
        if (timeline.id !== timelineId) return timeline;
        return {
          ...timeline,
          segments: timeline.segments.filter(
            (segment) => segment.id !== segmentId,
          ),
        };
      }),
    );
  };

  return (
    <div className="flex flex-col h-full bg-background/50">
      <ScrollArea className="flex-1">
        <SidebarSection
          title={t("research.graph.sidebar.timeline.tracks")}
          actions={
            <Button size="icon-xs" variant="ghost" onClick={handleAddTimeline}>
              <PlusCircle className="w-3.5 h-3.5" />
            </Button>
          }
        >
          {timelines.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[11px] text-muted-foreground opacity-50">
                {t("research.graph.sidebar.timeline.empty")}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-[10px] uppercase font-black"
                onClick={handleAddTimeline}
              >
                {t("research.graph.sidebar.timeline.createFirstTrack")}
              </Button>
            </div>
          ) : null}
          {timelines.map((timeline) => (
            <div key={timeline.id} className="group/track">
              <SidebarItem
                label={timeline.name}
                icon={Layout}
                isActive={selectedTimelineId === timeline.id}
                onClick={() => onSelectTimeline(timeline.id)}
              />
              {selectedTimelineId === timeline.id ? (
                <div className="ml-4 pl-4 border-l border-white/5 space-y-1 my-1">
                  {timeline.segments.map((segment) => (
                    <div
                      key={segment.id}
                      className="flex items-center gap-2 px-2 py-1 group/seg hover:bg-white/5 rounded-md"
                    >
                      <Clock className="w-3 h-3 text-primary/40" />
                      <input
                        className="bg-transparent border-none text-[11px] font-medium text-muted-foreground focus:text-foreground outline-none flex-1 truncate"
                        value={segment.name}
                        onChange={(e) =>
                          handleRenameSegment(
                            timeline.id,
                            segment.id,
                            e.target.value,
                          )
                        }
                      />
                      <button
                        className="p-0.5 opacity-0 transition-opacity group-hover/seg:opacity-100 hover:text-destructive"
                        onClick={() =>
                          handleDeleteSegment(timeline.id, segment.id)
                        }
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    className="flex items-center gap-2 px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
                    onClick={() => handleAddSegment(timeline.id)}
                  >
                    <Plus className="w-3 h-3" />{" "}
                    {t("research.graph.sidebar.timeline.addSegment")}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </SidebarSection>
      </ScrollArea>
      {selectedTimelineId ? (
        <div className="p-3 border-t border-white/5 bg-black/10 flex gap-2">
          <Input
            className="h-8 text-[11px] bg-white/5 border-none"
            placeholder={t("research.graph.sidebar.timeline.renamePlaceholder")}
            value={
              timelines.find((timeline) => timeline.id === selectedTimelineId)
                ?.name || ""
            }
            onChange={(e) =>
              handleRenameTimeline(selectedTimelineId, e.target.value)
            }
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:text-destructive"
            onClick={() => handleDeleteTimeline(selectedTimelineId)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
