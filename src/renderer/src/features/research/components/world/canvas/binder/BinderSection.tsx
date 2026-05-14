import type { ReactNode } from "react";
import { cn } from "@renderer/lib/utils";

interface BinderSectionProps {
  title: string;
  /** 섹션 헤더 우측 슬롯 */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * BinderBar 섹션 셸. 사이드바 SidebarSection과 톤은 같지만,
 * BinderBar는 ScrollArea 안쪽이라 본문 padding을 더 여유있게 둔다.
 */
export function BinderSection({
  title,
  action,
  className,
  children,
}: BinderSectionProps) {
  return (
    <section className={cn("flex flex-col gap-1.5", className)}>
      <header className="flex h-7 items-center justify-between px-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {action ? <div className="flex items-center">{action}</div> : null}
      </header>
      <div className="px-3">{children}</div>
    </section>
  );
}
