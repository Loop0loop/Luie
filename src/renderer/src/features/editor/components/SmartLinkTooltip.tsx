import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import type { Character, Event, Faction, Term } from "@shared/types";
import { smartLinkService } from "@renderer/features/editor/services/smartLinkService";

/** 스마트링크가 다루는 종류. editor.css의 data-type 규칙과 짝이 맞아야 한다. */
type SmartLinkTooltipType = "character" | "event" | "faction" | "term";

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  type: SmartLinkTooltipType;
  id: string;
};

export function SmartLinkTooltip({ isSettingsOpen }: { isSettingsOpen?: boolean }) {
  const [state, setState] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    type: "character",
    id: "",
  });

  const characters = useCharacterStore((state) => state.items);
  const events = useEventStore((state) => state.items);
  const factions = useFactionStore((state) => state.items);
  const terms = useTermStore((state) => state.items);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // NOTE: settings가 열리면 listener를 즉시 제거해야 한다.
  useEffect(() => {
    if (isSettingsOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const hideTimer = window.setTimeout(() => {
        setState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }, 0);
      return () => {
        window.clearTimeout(hideTimer);
      };
    }

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest(".smart-link-highlight");

      if (link) {
        const type = link.getAttribute("data-type") as SmartLinkTooltipType;
        const id = link.getAttribute("data-id");

        if (type && id) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          const rect = link.getBoundingClientRect();
          setState({
            visible: true,
            x: rect.left + window.scrollX,
            y: rect.bottom + window.scrollY + 5,
            type,
            id,
          });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest(".smart-link-highlight");
      if (link) {
        const related = e.relatedTarget as HTMLElement;
        if (related && link.contains(related)) {
          return;
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false }));
        }, 300);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest(".smart-link-highlight");
      if (link) {
        const type = link.getAttribute("data-type") as SmartLinkTooltipType;
        const id = link.getAttribute("data-id");
        if (type && id) {
          smartLinkService.openItem(id, type);
        }
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("click", handleClick);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("click", handleClick);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleTooltipEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleTooltipLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, visible: false }));
    }, 300);
  };

  if (!state.visible) return null;

  let content: { title: string; desc?: string | null; meta?: string } | null = null;
  const chars = characters as Character[];
  const termList = terms as Term[];

  if (state.type === "character") {
    const char = chars.find((c) => c.id === state.id);
    if (char) {
      content = {
        title: char.name,
        desc: char.description || "No description",
        meta: "Character",
      };
    }
  } else if (state.type === "event") {
    const event = (events as Event[]).find((e) => e.id === state.id);
    if (event) {
      content = {
        title: event.name,
        desc: event.description || "No description",
        meta: "Event",
      };
    }
  } else if (state.type === "faction") {
    const faction = (factions as Faction[]).find((f) => f.id === state.id);
    if (faction) {
      content = {
        title: faction.name,
        desc: faction.description || "No description",
        meta: "Faction",
      };
    }
  } else if (state.type === "term") {
    const term = termList.find((t) => t.id === state.id);
    if (term) {
      content = {
        title: term.term,
        desc: term.definition || "No definition",
        meta: "Term",
      };
    }
  }

  if (!content) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      onMouseEnter={handleTooltipEnter}
      onMouseLeave={handleTooltipLeave}
      className="fixed z-dropdown bg-popover text-popover-foreground rounded-control shadow-panel border border-border p-3 w-[250px] animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
      style={{
        left: state.x,
        top: state.y,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">{content.title}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted bg-secondary px-1.5 py-0.5 rounded-xs">
          {content.meta}
        </span>
      </div>
      <div className="text-xs text-muted line-clamp-3">
        {content.desc}
      </div>
    </div>,
    document.body,
  );
}
