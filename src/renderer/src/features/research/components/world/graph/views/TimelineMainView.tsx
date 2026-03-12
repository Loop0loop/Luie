import { useMemo, useCallback } from "react";
import { Clock, Plus, Filter, Search, MoreHorizontal, ArrowDown, MapPin, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import type { WorldGraphNode, EntityRelation } from "@shared/types";
import { useWorldBuildingStore } from "@renderer/features/research/stores/worldBuildingStore";
import { WORLD_GRAPH_NODE_THEMES } from "@shared/constants/worldGraphUI";

interface TimelineMainViewProps {
  nodes?: WorldGraphNode[];
  edges?: EntityRelation[];
}

export function TimelineMainView({ nodes: initialNodes = [], edges = [] }: TimelineMainViewProps) {
  const { t } = useTranslation();

  // For demonstration, if no actual timeline nodes exist, we use a beautiful Mock Empty or Mock Data state
  // This helps visualize the design.
  const hasNodes = initialNodes.length > 0;

  const MOCK_EVENTS = [
    { id: 1, title: "태초의 전쟁", date: "신화 시대", type: "Event", desc: "마왕이 처음으로 세상에 강림한 사건" },
    { id: 2, title: "제 1차 방어선 붕괴", date: "왕국력 123년", type: "Event", desc: "북부 산맥에서 마수 군단 돌파" },
    { id: 3, title: "아르웬의 귀환", date: "왕국력 125년", type: "Event", desc: "주인공이 검을 뽑고 왕도로 돌아옴" },
    { id: 4, title: "붉은 밤", date: "왕국력 125년 12월", type: "Event", desc: "왕도가 불길에 휩싸인 날" },
    { id: 5, title: "마지막 결전", date: "미정", type: "Event", desc: "안개 계곡에서의 최후의 전투" },
  ];

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center text-muted">
      <div className="h-16 w-16 mb-4 rounded-2xl bg-element/50 border border-border/40 flex items-center justify-center shadow-sm">
        <Clock className="h-8 w-8 opacity-50" />
      </div>
      <p className="text-sm font-medium text-fg/80 mb-1">Timeline is empty</p>
      <p className="text-xs opacity-70 mb-4 max-w-xs text-center">
        Create timeline events to see the chronological progression of your story.
      </p>
      <button className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-medium text-accent-fg hover:bg-accent/90 transition-colors">
        <Plus className="h-3.5 w-3.5" />
        Create First Event
      </button>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col bg-app">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
        <h2 className="text-sm font-semibold text-fg">Story Timeline</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
            <input
              type="text"
              placeholder="Search events..."
              className="w-64 rounded-md border border-border/60 bg-element pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-md border border-border/60 bg-element px-3 py-1.5 text-xs text-muted hover:bg-element-hover hover:text-fg transition-colors">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </button>
          <button className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:bg-accent/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New Event
          </button>
        </div>
      </div>

      {/* Main Content: Vertical Timeline View (like Notion / Linear) */}
      <div className="flex-1 overflow-auto p-8 flex justify-center">
        <div className="w-full max-w-4xl relative">
          
          {/* Vertical Line */}
          <div className="absolute left-[160px] top-4 bottom-4 w-0.5 bg-border/50" />

          {/* Timeline Items */}
          <div className="flex flex-col gap-6 relative z-10">
            {MOCK_EVENTS.map((event, idx) => (
              <div key={event.id} className="flex group">
                {/* Left Side: Date */}
                <div className="w-[160px] shrink-0 pt-3 pr-8 text-right">
                  <span className="text-xs font-bold text-accent/80">{event.date}</span>
                </div>

                {/* Node marker (on the line) */}
                <div className="relative flex flex-col items-center shrink-0 w-[1px]">
                  <div className="absolute top-[14px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-app border-2 border-accent shadow-sm group-hover:bg-accent transition-colors" />
                </div>

                {/* Right Side: Event Card */}
                <div className="pl-8 flex-1">
                  <div className="rounded-xl border border-border/40 bg-element/20 p-4 hover:border-accent/40 hover:bg-element/40 transition-all cursor-pointer shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                        {event.title}
                        <span className="inline-flex items-center rounded-full bg-border/40 px-2 py-0.5 text-[10px] font-medium text-muted">
                          {event.type}
                        </span>
                      </h3>
                      <button className="text-muted hover:text-fg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {event.desc}
                    </p>
                    
                    {/* Optional: Related Entities shown at the bottom of the card */}
                    {idx === 2 && (
                      <div className="mt-3 flex gap-2 border-t border-border/40 pt-3">
                         <span className="flex items-center gap-1 text-[10px] text-muted bg-app px-1.5 py-0.5 rounded border border-border/40">
                           <Users className="h-3 w-3" /> 아르웬
                         </span>
                         <span className="flex items-center gap-1 text-[10px] text-muted bg-app px-1.5 py-0.5 rounded border border-border/40">
                           <MapPin className="h-3 w-3" /> 왕도
                         </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}