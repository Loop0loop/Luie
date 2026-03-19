import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, GitBranchPlus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { WorldGraphNode } from "@shared/types";

type CanvasTimelinePaletteProps = {
  events: WorldGraphNode[];
  open: boolean;
  onClose: () => void;
  onCreateEvent: () => void;
  onPickEvent: (nodeId: string) => void;
};

const readEventDate = (node: WorldGraphNode, fallback: string): string =>
  typeof node.attributes?.date === "string"
    ? node.attributes.date
    : typeof node.attributes?.time === "string"
      ? node.attributes.time
      : fallback;

export function CanvasTimelinePalette({
  events,
  open,
  onClose,
  onCreateEvent,
  onPickEvent,
}: CanvasTimelinePaletteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length === 0) return events;
    return events.filter((event) => {
      const haystack = [
        event.name,
        event.description ?? "",
        readEventDate(event, t("research.graph.timeline.undated")),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [events, query, t]);

  const totalItems = filteredEvents.length + 1;

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        setQuery("");
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    return;
  }, [open]);

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl =
      listRef.current.querySelector<HTMLElement>(`[data-active="true"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % totalItems);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex === filteredEvents.length) {
        onCreateEvent();
        onClose();
      } else {
        const event = filteredEvents[activeIndex];
        if (event) {
          onPickEvent(event.id);
          onClose();
        }
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex justify-center pt-[72px]"
      style={{ background: "rgba(7,9,13,0.55)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[580px] overflow-hidden rounded-xl shadow-[0_32px_80px_rgba(0,0,0,0.55)]"
        style={{
          background: "rgba(18,21,28,0.98)",
          border: "1px solid rgba(255,255,255,0.09)",
        }}
        onKeyDown={handleKeyDown}
      >
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <Search className="h-4 w-4 shrink-0 text-fg/38" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder={t(
              "research.graph.canvas.timelinePalette.searchPlaceholder",
            )}
            className="w-full bg-transparent py-4 text-[14px] text-fg placeholder:text-fg/30 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-white/12 px-1.5 py-0.5 text-[10px] text-fg/30">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1.5">
          {filteredEvents.length === 0 && query.trim().length > 0 && (
            <p className="px-4 py-3 text-[12px] text-fg/35">
              {t("research.graph.canvas.timelinePalette.noMatch", {
                query,
              })}
            </p>
          )}

          {filteredEvents.map((event, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={event.id}
                type="button"
                data-active={isActive ? "true" : undefined}
                onClick={() => {
                  onPickEvent(event.id);
                  onClose();
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-none"
                style={{
                  background: isActive
                    ? "rgba(255,255,255,0.07)"
                    : "transparent",
                }}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{
                    background: isActive
                      ? "rgba(243,200,107,0.15)"
                      : "rgba(255,255,255,0.05)",
                  }}
                >
                  <Clock3
                    className="h-3.5 w-3.5"
                    style={{
                      color: isActive ? "#f3c86b" : "rgba(255,255,255,0.4)",
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13px] font-medium"
                    style={{
                      color: isActive
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(255,255,255,0.75)",
                    }}
                  >
                    {event.name}
                  </p>
                  {event.description && (
                    <p className="truncate text-[11px] text-fg/38">
                      {event.description}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 text-[11px]"
                  style={{
                    color: isActive
                      ? "rgba(243,200,107,0.7)"
                      : "rgba(255,255,255,0.25)",
                  }}
                >
                  {readEventDate(event, t("research.graph.timeline.undated"))}
                </span>
              </button>
            );
          })}

          <div
            style={{
              borderTop:
                filteredEvents.length > 0
                  ? "1px solid rgba(255,255,255,0.06)"
                  : "none",
            }}
            className="pt-1"
          >
            {(() => {
              const isActive = activeIndex === filteredEvents.length;
              return (
                <button
                  type="button"
                  data-active={isActive ? "true" : undefined}
                  onClick={() => {
                    onCreateEvent();
                    onClose();
                  }}
                  onMouseEnter={() => setActiveIndex(filteredEvents.length)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.07)"
                      : "transparent",
                  }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      background: isActive
                        ? "rgba(119,185,255,0.15)"
                        : "rgba(255,255,255,0.05)",
                    }}
                  >
                    <GitBranchPlus
                      className="h-3.5 w-3.5"
                      style={{
                        color: isActive ? "#77b9ff" : "rgba(255,255,255,0.4)",
                      }}
                    />
                  </div>
                  <p
                    className="text-[13px] font-medium"
                    style={{
                      color: isActive
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {t("research.graph.canvas.timelinePalette.createBlock")}
                  </p>
                  <kbd
                    className="ml-auto shrink-0 rounded border px-1.5 py-0.5 text-[10px]"
                    style={{
                      borderColor: isActive
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(255,255,255,0.08)",
                      color: isActive
                        ? "rgba(255,255,255,0.45)"
                        : "rgba(255,255,255,0.22)",
                    }}
                  >
                    ↵
                  </kbd>
                </button>
              );
            })()}
          </div>
        </div>

        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="flex items-center gap-1 text-[11px] text-fg/28">
            <kbd className="rounded border border-white/10 px-1 py-px text-[9px]">
              ↑↓
            </kbd>
            {t("research.graph.canvas.timelinePalette.move")}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-fg/28">
            <kbd className="rounded border border-white/10 px-1 py-px text-[9px]">
              ↵
            </kbd>
            {t("research.graph.canvas.timelinePalette.select")}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-fg/28">
            <kbd className="rounded border border-white/10 px-1 py-px text-[9px]">
              ESC
            </kbd>
            {t("research.graph.canvas.timelinePalette.close")}
          </span>
        </div>
      </div>
    </div>
  );
}
