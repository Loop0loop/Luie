import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface SidebarTreeSectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function SidebarTreeSection({ title, defaultExpanded = true, children }: SidebarTreeSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col border-b border-border/20 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 px-2 py-1.5 hover:bg-element text-muted hover:text-fg transition-colors w-full cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
      </button>
      {isExpanded && <div className="flex flex-col py-1 text-sm">{children}</div>}
    </div>
  );
}

interface TreeItemProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function TreeItem({ icon, label, onClick, isActive }: TreeItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2 px-6 py-1 text-[13px] transition-colors cursor-pointer text-left",
        isActive ? "bg-accent/10 text-accent font-medium" : "text-muted hover:bg-element hover:text-fg"
      )}
    >
      {icon && <span className="shrink-0 flex items-center justify-center opacity-70">{icon}</span>}
      <span className="truncate flex-1">{label}</span>
    </button>
  );
}
