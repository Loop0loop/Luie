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
    className={cn(
      "flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs text-muted transition-colors hover:bg-hover hover:text-fg disabled:pointer-events-none disabled:opacity-45",
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

export const Divider = () => <div className="mx-1 h-5 w-px shrink-0 bg-border/70" />;
