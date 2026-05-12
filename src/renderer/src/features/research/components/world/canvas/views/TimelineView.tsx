import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import type { WorldGraphNode } from "@shared/types";
import { GRAPH_ENTITY_BADGE_COLOR_TOKENS } from "../shared/theme/graphThemeConstants";
import { cn } from "@renderer/lib/utils";

interface TimelineViewProps {
  eventNodes: WorldGraphNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

function readEventDate(attributes: unknown): string | null {
  if (!attributes || typeof attributes !== "object" || Array.isArray(attributes)) return null;
  const raw = (attributes as Record<string, unknown>).date ?? (attributes as Record<string, unknown>).time;
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}

export function TimelineView({ eventNodes, selectedNodeId, onSelectNode }: TimelineViewProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -280 : 280, behavior: "smooth" });
  };

  if (eventNodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <CalendarRange size={36} className="text-muted/40" strokeWidth={1} />
        <p className="text-[13px] text-muted">{t("canvas.timeline.empty")}</p>
        <p className="text-[11px] text-muted/60">{t("canvas.timeline.emptyHint")}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-5 py-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={14} className="text-muted" />
          <span className="text-[12px] font-semibold text-fg">{t("canvas.tab.timeline")}</span>
          <span className="rounded-full border border-border/40 bg-element px-2 py-0.5 text-[10px] text-muted">
            {eventNodes.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-element hover:text-fg"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-element hover:text-fg"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Timeline scroll area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Center axis line */}
        <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-0 h-px -translate-y-1/2 bg-border/30" />

        <div ref={scrollRef} className="flex h-full items-center gap-0 overflow-x-auto overflow-y-hidden px-8 scrollbar-none">
          {eventNodes.map((node, idx) => {
            const date = readEventDate(node.attributes);
            const isSelected = selectedNodeId === node.id;
            const isHovered = hovered === node.id;
            const isAbove = idx % 2 === 0;
            const colors = GRAPH_ENTITY_BADGE_COLOR_TOKENS.Event;

            return (
              <div
                key={node.id}
                className="relative flex shrink-0 flex-col items-center"
                style={{ width: 180 }}
              >
                {/* Card above or below axis */}
                <div className={cn("absolute w-[160px]", isAbove ? "bottom-[calc(50%+20px)]" : "top-[calc(50%+20px)]")}>
                  <button
                    type="button"
                    onClick={() => onSelectNode(isSelected ? null : node.id)}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "w-full rounded-xl border p-2.5 text-left shadow-sm transition-all duration-150",
                      isSelected
                        ? `${colors.card} shadow-md`
                        : isHovered
                          ? "border-border/60 bg-element/80"
                          : "border-border/30 bg-panel/70",
                    )}
                  >
                    {date && (
                      <p className="mb-1 text-[9px] font-semibold uppercase tracking-widest text-muted">
                        {date}
                      </p>
                    )}
                    <p className="truncate text-[12px] font-semibold text-fg">{node.name}</p>
                    {node.description && (
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
                        {node.description}
                      </p>
                    )}
                  </button>
                </div>

                {/* Connector stem */}
                <div className={cn("absolute w-px bg-border/40", isAbove ? "bottom-[50%] h-5" : "top-[50%] h-5")} />

                {/* Axis dot */}
                <div
                  className={cn(
                    "relative z-10 h-3 w-3 rounded-full border-2 transition-all duration-150",
                    isSelected ? "border-amber-400 bg-amber-400/30 scale-125" : "border-border/60 bg-panel",
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
