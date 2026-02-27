import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useTermStore } from "@renderer/features/research/stores/termStore";
import type { Character, Term } from "@shared/types";
import { smartLinkService } from "@renderer/features/editor/services/smartLinkService";

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  type: "character" | "term";
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

  const { items: characters } = useCharacterStore();
  const { items: terms } = useTermStore();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // ✅ Pass isSettingsOpen as dependency — when settings open, remove listeners immediately
  useEffect(() => {
    // Hide tooltip and suppress events while settings are open
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
        const type = link.getAttribute("data-type") as "character" | "term";
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
        const type = link.getAttribute("data-type") as "character" | "term";
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
      // ✅ Always cancel pending timeout before removing listeners
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("click", handleClick);
    };
  }, [isSettingsOpen]);

  // ✅ Final cleanup on unmount — guarantee timeout is cleared
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
      // ✅ z-[9999] to match Tailwind's registered z-index scale
      className="fixed z-[9999] bg-popover text-popover-foreground rounded-md shadow-xl border border-border p-3 w-[250px] animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
      style={{
        left: state.x,
        top: state.y,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm">{content.title}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
          {content.meta}
        </span>
      </div>
      <div className="text-xs text-muted-foreground line-clamp-3">
        {content.desc}
      </div>
    </div>,
    document.body,
  );
}
