import { ChevronLeft, ChevronRight } from "lucide-react";

type SidebarCollapseStripProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

/**
 * Thin vertical strip always rendered in the flex flow (not absolutely positioned).
 * When collapsed: shows ChevronRight → clicking expands the sidebar.
 * When expanded: shows ChevronLeft → clicking collapses the sidebar.
 * Being in-flow means it pushes the main content rather than overlaying it.
 */
export function SidebarCollapseStrip({
  isCollapsed,
  onToggle,
}: SidebarCollapseStripProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isCollapsed ? "사이드바 열기" : "사이드바 닫기"}
      className="flex-shrink-0 w-2.5 h-full flex items-center justify-center bg-sidebar border-r border-border/50 hover:bg-accent/15 hover:border-accent/40 transition-colors cursor-pointer group"
    >
      {isCollapsed ? (
        <ChevronRight
          size={9}
          className="text-muted/60 group-hover:text-accent transition-colors"
        />
      ) : (
        <ChevronLeft
          size={9}
          className="text-muted/60 group-hover:text-accent transition-colors"
        />
      )}
    </button>
  );
}
