// no use
import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";

// Strip is wider when collapsed so "펼치기" label is readable
const STRIP_WIDTH_COLLAPSED = 22;
const STRIP_WIDTH_EXPANDED = 10;
const PEEK_WIDTH = 200;

type SidebarCollapseStripProps = {
  isCollapsed: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

export function SidebarCollapseStrip({
  isCollapsed,
  onToggle,
  children,
}: SidebarCollapseStripProps) {
  const { t } = useTranslation();
  const [isPeeking, setIsPeeking] = useState(false);

  const openPeek = useCallback(() => {
    if (isCollapsed) setIsPeeking(true);
  }, [isCollapsed]);

  const closePeek = useCallback(() => setIsPeeking(false), []);

  // Strip click only toggles when peek is NOT visible.
  // When peek is open, accidental strip clicks are ignored —
  // only the explicit 펼치기 button inside the peek expands.
  const handleStripClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPeeking) return;
      onToggle();
    },
    [onToggle, isPeeking],
  );

  const handleExpandFromPeek = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsPeeking(false);
      onToggle();
    },
    [onToggle],
  );

  const peekVisible = isCollapsed && isPeeking && !!children;
  const stripWidth = isCollapsed ? STRIP_WIDTH_COLLAPSED : STRIP_WIDTH_EXPANDED;

  return (
    <>
      {/* Strip — always in flex flow */}
      <div
        style={{ width: stripWidth }}
        className="flex-shrink-0 h-full flex flex-col bg-sidebar border-r border-border/50 z-10 transition-[width] duration-150"
        onMouseEnter={openPeek}
        onMouseLeave={closePeek}
      >
        {/* Toggle area — takes remaining height */}
        <button
          type="button"
          onClick={handleStripClick}
          aria-label={isCollapsed ? t("sidebar.expand") : t("mainLayout.tooltip.sidebarCollapse")}
          className="flex-1 flex items-center justify-center hover:bg-accent/15 transition-colors cursor-pointer group"
        >
          {isCollapsed ? (
            <ChevronRight
              size={9}
              className="text-muted/50 group-hover:text-accent transition-colors"
            />
          ) : (
            <ChevronLeft
              size={9}
              className="text-muted/50 group-hover:text-accent transition-colors"
            />
          )}
        </button>

        {/* Always-visible bottom toggle — shows 펼치기/접기 */}
        <button
          type="button"
          onClick={handleStripClick}
          title={isCollapsed ? t("sidebar.expand") : t("mainLayout.tooltip.sidebarCollapse")}
          className="shrink-0 h-9 flex flex-col items-center justify-center gap-0.5 border-t border-border/40 hover:bg-accent/15 transition-colors cursor-pointer group"
        >
          {isCollapsed ? (
            <>
              <ChevronsRight
                size={9}
                className="text-muted/40 group-hover:text-accent transition-colors"
              />
              <span
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                className="text-[8px] text-muted/40 group-hover:text-accent transition-colors leading-none"
              >
                {t("sidebar.expand")}
              </span>
            </>
          ) : (
            <ChevronsLeft
              size={9}
              className="text-muted/40 group-hover:text-accent transition-colors"
            />
          )}
        </button>
      </div>

      {/* Peek panel — slides in on hover when collapsed */}
      <div
        onMouseEnter={() => isCollapsed && setIsPeeking(true)}
        onMouseLeave={closePeek}
        className="absolute top-0 bottom-0 z-20 bg-sidebar/95 border-r border-border/30 shadow-xl overflow-hidden transition-[width] duration-150 ease-out flex flex-col"
        style={{
          left: stripWidth,
          width: peekVisible ? PEEK_WIDTH : 0,
          pointerEvents: peekVisible ? "auto" : "none",
        }}
      >
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col"
          style={{ width: PEEK_WIDTH }}
        >
          {children}
        </div>

        {/* Explicit expand button inside peek — this is the ONLY way to expand from collapsed+peeking state */}
        <button
          type="button"
          onClick={handleExpandFromPeek}
          style={{ width: PEEK_WIDTH }}
          className="shrink-0 flex items-center justify-center gap-1.5 h-8 border-t border-border/50 text-xs text-muted hover:text-fg hover:bg-surface-hover transition-colors"
        >
          <ChevronsRight size={11} />
          {t("sidebar.expand")}
        </button>
      </div>
    </>
  );
}
