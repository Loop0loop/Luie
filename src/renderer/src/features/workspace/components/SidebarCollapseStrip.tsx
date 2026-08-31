import { useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

// NOTE: 접힌 상태에서도 "펼치기" label이 보이도록 strip 너비를 유지한다.
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
  const enableAnimations = useEditorStore((state) => state.enableAnimations);
  const [isPeeking, setIsPeeking] = useState(false);

  const openPeek = useCallback(() => {
    if (isCollapsed) setIsPeeking(true);
  }, [isCollapsed]);

  const closePeek = useCallback(() => setIsPeeking(false), []);

  // NOTE: peek가 열렸을 때 strip click으로 sidebar가 닫히지 않게 한다.
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
      <div
        style={{ width: stripWidth }}
        className={`flex-shrink-0 h-full flex flex-col bg-sidebar border-r border-border z-10 ${
          enableAnimations
            ? "transition-[width] duration-150 motion-reduce:transition-none"
            : "transition-none"
        }`}
        onMouseEnter={openPeek}
        onMouseLeave={closePeek}
      >
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

        <button
          type="button"
          onClick={handleStripClick}
          title={isCollapsed ? t("sidebar.expand") : t("mainLayout.tooltip.sidebarCollapse")}
          className="shrink-0 h-9 flex flex-col items-center justify-center gap-0.5 border-t border-border hover:bg-accent/15 transition-colors cursor-pointer group"
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

      <div
        onMouseEnter={() => isCollapsed && setIsPeeking(true)}
        onMouseLeave={closePeek}
        className={`absolute top-0 bottom-0 z-20 bg-sidebar/95 border-r border-border shadow-panel overflow-hidden flex flex-col ${
          enableAnimations
            ? "transition-transform duration-150 ease-out motion-reduce:transition-none"
            : "transition-none"
        }`}
        style={{
          left: stripWidth,
          width: PEEK_WIDTH,
          transform: peekVisible ? "translateX(0)" : "translateX(-100%)",
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
          onClick={handleExpandFromPeek}
          style={{ width: PEEK_WIDTH }}
          className="shrink-0 flex items-center justify-center gap-1.5 h-8 border-t border-border text-xs text-muted hover:text-fg hover:bg-surface-hover transition-colors"
        >
          <ChevronsRight size={11} />
          {t("sidebar.expand")}
        </button>
      </div>
    </>
  );
}
