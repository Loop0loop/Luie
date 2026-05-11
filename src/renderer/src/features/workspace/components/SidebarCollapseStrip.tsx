import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STRIP_WIDTH = 10;
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
  const [isPeeking, setIsPeeking] = useState(false);

  const openPeek = useCallback(() => {
    if (isCollapsed) setIsPeeking(true);
  }, [isCollapsed]);

  const closePeek = useCallback(() => setIsPeeking(false), []);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsPeeking(false);
      onToggle();
    },
    [onToggle],
  );

  const peekVisible = isCollapsed && isPeeking && !!children;

  return (
    <>
      {/* Strip — always in flex flow */}
      <button
        type="button"
        style={{ width: STRIP_WIDTH }}
        onMouseEnter={openPeek}
        onMouseLeave={closePeek}
        onClick={handleToggle}
        aria-label={isCollapsed ? "사이드바 열기" : "사이드바 닫기"}
        className="flex-shrink-0 h-full flex items-center justify-center bg-sidebar border-r border-border/50 hover:bg-accent/15 hover:border-accent/40 transition-colors cursor-pointer group z-10"
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

      {/* Peek panel — slides in on hover, overlays main content */}
      <div
        onMouseEnter={() => isCollapsed && setIsPeeking(true)}
        onMouseLeave={closePeek}
        onClick={peekVisible ? closePeek : undefined}
        className="absolute top-0 bottom-0 z-20 bg-sidebar/95 border-r border-border/30 shadow-2xl overflow-hidden transition-[width] duration-150 ease-out flex flex-col"
        style={{
          left: STRIP_WIDTH,
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

        <button
          type="button"
          onClick={handleToggle}
          style={{ width: PEEK_WIDTH }}
          className="shrink-0 flex items-center justify-center gap-1.5 h-8 border-t border-border/50 text-xs text-muted hover:text-fg hover:bg-surface-hover transition-colors"
        >
          <ChevronRight size={11} />
          펼치기
        </button>
      </div>
    </>
  );
}
