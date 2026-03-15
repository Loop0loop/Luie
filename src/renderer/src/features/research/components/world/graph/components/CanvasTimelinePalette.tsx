import { useMemo, useState } from "react";
import { Clock3, GitBranchPlus, Search, Sparkles } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card";
import { Input } from "@renderer/components/ui/input";

type CanvasTimelinePaletteProps = {
  events: WorldGraphNode[];
  open: boolean;
  onClose: () => void;
  onCreateEvent: () => void;
  onPickEvent: (nodeId: string) => void;
};

const readEventDate = (node: WorldGraphNode): string =>
  typeof node.attributes?.date === "string"
    ? node.attributes.date
    : typeof node.attributes?.time === "string"
      ? node.attributes.time
      : "날짜 미정";

export function CanvasTimelinePalette({
  events,
  open,
  onClose,
  onCreateEvent,
  onPickEvent,
}: CanvasTimelinePaletteProps) {
  const [query, setQuery] = useState("");

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) {
      return events;
    }
    return events.filter((event) => {
      const haystack = [
        event.name,
        event.description ?? "",
        readEventDate(event),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [events, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#07090d]/60 px-6 backdrop-blur-sm">
      <Card className="w-full max-w-3xl border-white/10 bg-[#12161d]/96 text-fg shadow-[0_26px_80px_rgba(0,0,0,0.45)]">
        <CardHeader className="border-b border-white/6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-fg/55">
                <Sparkles className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-[0.24em]">
                  Worldline Palette
                </span>
              </div>
              <CardTitle className="text-xl text-fg">
                타임라인 사건을 새 블럭으로 꺼내기
              </CardTitle>
            </div>
            <Button type="button" variant="ghost" onClick={onClose}>
              닫기
            </Button>
          </div>
          <div className="mt-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg/40" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 border-white/10 bg-[#0e1218] pl-9"
                placeholder="사건, 설명, 날짜 검색"
              />
            </div>
            <Button type="button" variant="secondary" onClick={onCreateEvent}>
              <GitBranchPlus className="h-4 w-4" />
              새 사건
            </Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[460px] overflow-y-auto py-4">
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  onPickEvent(event.id);
                  onClose();
                }}
                className="w-full rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-left transition hover:border-cyan-300/25 hover:bg-cyan-500/8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-cyan-200/70" />
                      <p className="text-base font-semibold text-fg">{event.name}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-fg/62">
                      {event.description?.trim() || "세계선 분기 설명을 추가할 수 있습니다."}
                    </p>
                  </div>
                  <Badge variant="outline">{readEventDate(event)}</Badge>
                </div>
              </button>
            ))}
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-8 text-center text-sm text-fg/62">
                검색 결과가 없습니다. 새 사건을 만든 뒤 다시 가져오면 됩니다.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
