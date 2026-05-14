import type { ReactNode } from "react";
import { cn } from "@renderer/lib/utils";

interface SidebarSectionProps {
  title: string;
  /** 섹션 헤더 우측 슬롯 (액션 버튼 등) */
  action?: ReactNode;
  /** 섹션 본문이 가득 차야 할 때 (Outline 같은 가변 높이 영역) */
  fill?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * 사이드바 섹션의 공통 셸.
 *
 * - 섹션 타이틀은 `text-muted-foreground` + 작은 트래킹으로
 *   본문보다 한 단계 약하게 표시한다.
 * - 헤더 우측에 [+] 같은 액션 버튼을 배치할 수 있다.
 * - `fill`을 켜면 본문 영역이 남은 공간을 채운다.
 */
export function SidebarSection({
  title,
  action,
  fill = false,
  className,
  children,
}: SidebarSectionProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-1.5",
        fill && "min-h-0 flex-1",
        className,
      )}
    >
      <header className="flex h-7 items-center justify-between px-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {action ? <div className="flex items-center">{action}</div> : null}
      </header>
      <div className={cn("px-2", fill && "min-h-0 flex-1")}>{children}</div>
    </section>
  );
}
