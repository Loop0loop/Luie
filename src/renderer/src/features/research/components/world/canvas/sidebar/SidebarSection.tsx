import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface SidebarSectionProps {
  title: string;
  /** 섹션 헤더 우측 슬롯 (액션 버튼 등) */
  action?: ReactNode;
  /** 섹션 본문이 가득 차야 할 때 (Outline 같은 가변 높이 영역) */
  fill?: boolean;
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 사이드바 섹션 셸 — Obsidian 스타일.
 *
 * - 섹션 타이틀: 11px, uppercase, muted. 클릭 시 접기/펼치기.
 * - 접힌 상태에서는 chevron이 회전하고 본문이 숨겨진다.
 * - 헤더 우측에 액션 버튼 배치 가능.
 * - `fill`을 켜면 본문 영역이 남은 공간을 채운다.
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
          collapsible && "cursor-pointer select-none hover:bg-muted/50",
        )}
        onClick={collapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        {collapsible ? (
          <ChevronDown
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform duration-150",
              isCollapsed && "-rotate-90",
            )}
          />
        ) : null}
        <span className="flex-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
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
        <div className={cn("px-2 pb-1", fill && "min-h-0 flex-1 overflow-hidden")}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
