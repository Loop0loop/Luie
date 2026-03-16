import type { WorldGraphNode } from "@shared/types";
import { Badge } from "@renderer/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";

type TimelineViewProps = {
  events: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
};

const readEventDate = (node: WorldGraphNode): string =>
  typeof node.attributes?.date === "string"
    ? node.attributes.date
    : typeof node.attributes?.time === "string"
      ? node.attributes.time
      : "날짜 미정";

export function TimelineView({
  events,
  selectedNodeId,
  onSelectNode,
}: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1319] px-8">
        <div className="max-w-md rounded-[24px] border border-dashed border-border/60 bg-white/5 px-6 py-8 text-center text-sm text-fg/65">
          사건이 아직 없습니다. 왼쪽 사이드바에서 새 사건을 만들면 여기서 시간 순으로 정렬됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#0f1319] px-10 py-10">
      <div className="relative mx-auto max-w-4xl">
        <div className="absolute left-[22px] top-0 h-full w-px bg-white/10" />
        <div className="space-y-5">
          {events.map((event) => {
            const active = event.id === selectedNodeId;

            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectNode(event.id)}
                className="relative flex w-full items-start gap-5 text-left"
              >
                <span
                  className={[
                    "relative z-10 mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
                    active
                      ? "border-amber-300/60 bg-amber-500/20 text-amber-100"
                      : "border-border/60 bg-[#161a21] text-fg/70",
                  ].join(" ")}
                >
                  {events.indexOf(event) + 1}
                </span>

                <Card
                  className={[
                    "flex-1 rounded-[24px] border transition",
                    active
                      ? "border-amber-300/35 bg-amber-500/10"
                      : "border-border/60 bg-[#161a21] hover:bg-white/5",
                  ].join(" ")}
                >
                  <CardHeader className="pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg text-fg">{event.name}</CardTitle>
                    <Badge variant="outline">{readEventDate(event)}</Badge>
                  </div>
                  </CardHeader>
                  <CardContent>
                  <p className="mt-3 text-sm leading-7 text-fg/62">
                    {event.description?.trim() || "설명이 아직 없습니다."}
                  </p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
