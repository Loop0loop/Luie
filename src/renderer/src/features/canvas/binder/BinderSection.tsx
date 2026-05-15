import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@renderer/lib/utils";

interface BinderSectionProps {
  /** 헤더에 표시할 라벨. 없으면 헤더 자체를 그리지 않음 (인스펙터 본문용). */
  title?: string;
  /** 헤더 우측 슬롯 */
  action?: ReactNode;
  /** 접기/펼치기 가능 여부 */
  collapsible?: boolean;
  /** 기본 접힘 상태 */
  defaultCollapsed?: boolean;
  /** 위쪽에 구분선을 그릴지 (섹션 사이 분리) */
  divider?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * BinderBar 섹션 셸 — Scrivener Inspector 스타일.
 *
 * 빈 섹션이 화면을 차지하지 않게 `title`이 없으면 헤더를 생략한다.
 * 섹션 간 시각적 분리는 `divider` prop으로 위에 1px 구분선만 그린다.
 */
export function BinderSection({
  title,
  action,
  collapsible = false,
  defaultCollapsed = false,
  divider = false,
  className,
  children,
}: BinderSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible && collapsed;

  return (
    <section
      className={cn(
        "flex flex-col",
        divider && "mt-1 border-t border-border/50 pt-1",
        className,
      )}
    >
      {title ? (
        <header
          className={cn(
            "flex h-7 items-center gap-1 px-3",
            collapsible &&
              "cursor-pointer select-none rounded-sm hover:bg-surface-hover",
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
          <span className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
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
      ) : null}
      {!isCollapsed ? <div className="px-3 pb-2">{children}</div> : null}
    </section>
  );
}
