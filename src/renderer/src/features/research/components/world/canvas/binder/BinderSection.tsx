import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface BinderSectionProps {
  title: string;
  /** 섹션 헤더 우측 슬롯 */
  action?: ReactNode;
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * BinderBar 섹션 셸 — Obsidian 스타일.
 *
 * Sidebar SidebarSection과 동일한 접기/펼치기 패턴이지만,
 * BinderBar는 우측이라 padding을 약간 더 넓게 둔다.
 */
export function BinderSection({
  title,
  action,
  collapsible = false,
  defaultCollapsed = false,
  className,
  children,
}: BinderSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible && collapsed;

  return (
    <section className={cn("flex flex-col", className)}>
      <header
        className={cn(
          "flex h-8 items-center gap-1 px-3",
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
      {!isCollapsed ? <div className="px-3 pb-2">{children}</div> : null}
    </section>
  );
}
