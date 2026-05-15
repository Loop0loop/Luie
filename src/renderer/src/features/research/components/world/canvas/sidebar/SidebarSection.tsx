import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface SidebarSectionProps {
  title: string;
  /** 섹션 헤더 우측 슬롯 */
  action?: ReactNode;
  /** 본문 영역이 남은 공간을 채워야 하는지 */
  fill?: boolean;
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 사이드바 섹션 셸 — 워크스페이스 사이드바 톤(`text-muted`,
 * uppercase tracking)과 동일한 헤더 스타일.
 *
 * 헤더 클릭 시 접기/펼치기. 토큰은 `text-fg`/`text-muted`/`bg-surface-hover`로
 * 통일해서 워크스페이스 내 다른 사이드바(Scrivener Binder 등)와 결을 맞춘다.
 */
export function SidebarSection({
  title,
  action,
  fill = false,
  collapsible = false,
  defaultCollapsed = false,
  className,
  children,
}: SidebarSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible && collapsed;

  return (
    <section
      className={cn(
        "flex flex-col",
        fill && !isCollapsed && "min-h-0 flex-1",
        className,
      )}
    >
      <header
        className={cn(
          "flex h-7 items-center gap-1 px-3",
          collapsible && "cursor-pointer select-none rounded-sm hover:bg-surface-hover",
        )}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        {collapsible ? (
          <ChevronDown
            className={cn(
              "size-3 shrink-0 text-muted transition-transform duration-150",
              isCollapsed && "-rotate-90",
            )}
          />
        ) : null}
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
          {title}
        </span>
        {action && !isCollapsed ? (
          <div
            className="flex items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {action}
          </div>
        ) : null}
      </header>
      {!isCollapsed ? (
        <div
          className={cn(
            "px-2 pb-2",
            fill && "min-h-0 flex-1 overflow-hidden",
          )}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
