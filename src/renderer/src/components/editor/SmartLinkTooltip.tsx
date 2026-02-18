import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useCharacterStore } from "../../stores/characterStore";
import { useTermStore } from "../../stores/termStore";
import type { Character, Term } from "../../../../shared/types";
import { smartLinkService } from "../../services/smartLinkService";

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  type: "character" | "term";
  id: string;
};

export function SmartLinkTooltip() {
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

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Use closest to find the link element even if hovering over bold/italic text inside
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
      // Tricky part: standard mouseout fires when leaving ANY child element
      // We want to hide ONLY if we are leaving the link wrapper entirely.
      // But simpler logic: if we left *something* that was inside a link, we might still be inside the link?
      // No, mouseout bubbles.
      // Better approach: use mouseleave on the link itself? We can't easily add listeners to all links dynamically.
      
      // Alternative: checks relatedTarget to see if we moved TO something inside the link.
      const link = target.closest(".smart-link-highlight");
      if (link) {
        const related = e.relatedTarget as HTMLElement;
        if (related && link.contains(related)) {
            // Moved to a child element inside the same link, ignore
            return;
        }

        // Delay hiding to allow moving to tooltip
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
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("click", handleClick);
    };
  }, []);

  // Keep tooltip open when hovering the tooltip itself
  const handleTooltipEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleTooltipLeave = () => {
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
      className="fixed z-40 bg-popover text-popover-foreground rounded-md shadow-md border border-border p-3 w-[250px] animate-in fade-in zoom-in-95 duration-200 pointer-events-auto cursor-default"
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
    document.body
  );
}
