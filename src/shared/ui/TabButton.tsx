import type { ReactNode } from "react";
import { cn } from "@shared/types/utils";

type TabButtonProps = {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
  className?: string;
  activeClassName?: string;
  inactiveClassName?: string;
};

export default function TabButton({
  label,
  active,
  onClick,
  className,
  activeClassName,
  inactiveClassName,
}: TabButtonProps) {
  return (
    <div
      className={cn(className, active ? activeClassName : inactiveClassName)}
      onClick={onClick}
    >
      {label}
    </div>
  );
}
