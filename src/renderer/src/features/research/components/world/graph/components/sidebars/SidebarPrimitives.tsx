import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@renderer/lib/utils";

export function SidebarSection({
  title,
  defaultOpen = true,
  children,
  actions,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col border-b border-white/5">
      <div
        className="flex h-9 items-center justify-between px-2 hover:bg-white/5 cursor-pointer group select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-[11px] font-black uppercase tracking-[0.1em] text-muted-foreground truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      </div>
      {isOpen ? <div className="pb-2">{children}</div> : null}
    </div>
  );
}

export function SidebarItem({
  label,
  icon: Icon,
  isActive,
  onClick,
  subLabel,
}: {
  label: string;
  icon: React.ElementType;
  isActive?: boolean;
  onClick?: () => void;
  subLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2.5 px-4 cursor-pointer transition-all select-none",
        isActive
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
      )}
      onClick={onClick}
    >
      <Icon
        className={cn(
          "w-4 h-4 shrink-0",
          isActive ? "text-primary" : "text-muted-foreground/60",
        )}
      />
      <span className="flex-1 truncate text-[13px] font-medium leading-none">
        {label}
      </span>
      {subLabel ? (
        <span className="text-[10px] opacity-40 pr-1">{subLabel}</span>
      ) : null}
    </div>
  );
}
