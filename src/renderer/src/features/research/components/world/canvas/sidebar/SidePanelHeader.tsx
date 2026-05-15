import { type ReactNode } from "react";

interface SidePanelHeaderProps {
  /** 섹션 타이틀 (Activity 라벨과 동일하게 사용). */
  title: string;
  /** 우측 액션 슬롯 (예: + 버튼). */
  action?: ReactNode;
}

/**
 * SidePanel 상단 헤더.
 *
 * Editor `Sidebar.tsx`의 섹션 헤더 패턴을 인용:
 *   text-[11px] font-semibold uppercase tracking-wider text-muted
 *
 * Activity가 바뀌어도 좌측 라벨 위치/타이포가 그대로라 흐름이 끊기지 않는다.
 */
export function SidePanelHeader({ title, action }: SidePanelHeaderProps) {
  return (
    <header className="flex h-9 shrink-0 items-center gap-2 px-3">
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {title}
      </span>
      {action ? (
        <div className="flex items-center gap-1">{action}</div>
      ) : null}
    </header>
  );
}
