import type { ReactNode } from "react";

import { cn } from "@shared/types/utils";

export const ToolbarButton = ({
  active,
  children,
  className,
  disabled,
  label,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  title?: string;
}) => (
  <button
    type="button"
    aria-label={label}
    // NOTE: 눌린 상태를 색으로만 알리면 스크린리더 사용자에게 전달되지 않는다.
    // `false`를 그대로 넘기면 토글이 아닌 버튼도 "안 눌림"으로 읽히므로, active를
    // 받지 않은 호출처는 `undefined`로 두어 일반 버튼으로 남긴다.
    aria-pressed={active === undefined ? undefined : active}
    className={cn(
      "flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-45",
      active && "bg-accent/15 text-accent",
      className,
    )}
    title={title ?? label}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);

export const Divider = () => <div className="mx-1 h-5 w-px shrink-0 bg-border" />;
