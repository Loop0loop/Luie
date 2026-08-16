import { type ReactNode, useCallback, useState } from "react";
import { ChevronRight } from "lucide-react";

const STRIP_WIDTH = 12;
const PEEK_WIDTH = 220;

type SidebarHoverStripProps = {
  children: ReactNode;
  onExpand: () => void;
};

export function SidebarHoverStrip({
  children,
  onExpand,
}: SidebarHoverStripProps) {
  const [isPeeking, setIsPeeking] = useState(false);

  const handleExpand = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setIsPeeking(false);
      onExpand();
    },
    [onExpand],
  );

  return (
    <div
      className="pointer-events-auto absolute left-0 top-0 bottom-0 z-40 flex"
      onMouseLeave={() => setIsPeeking(false)}
    >
      <button
        type="button"
        aria-label="사이드바 열기"
        className="flex h-full shrink-0 cursor-pointer items-center justify-center border-r border-border/50 bg-sidebar/80 text-muted transition-colors hover:border-accent/40 hover:bg-accent/15 hover:text-accent"
        style={{ width: STRIP_WIDTH }}
        onClick={handleExpand}
        onMouseEnter={() => setIsPeeking(true)}
      >
        <ChevronRight size={10} />
      </button>

      <div
        className="flex h-full flex-col overflow-hidden border-r border-border bg-sidebar shadow-lg transition-[width] duration-150 ease-out"
        style={{ width: isPeeking ? PEEK_WIDTH : 0 }}
      >
        <div
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          style={{ width: PEEK_WIDTH }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
