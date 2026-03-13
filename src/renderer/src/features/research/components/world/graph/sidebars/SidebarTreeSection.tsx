import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@renderer/components/ui/collapsible";
import { cn } from "@renderer/lib/utils";
import { useState } from "react";

interface SidebarTreeSectionProps {
  title: string;
  defaultExpanded?: boolean;
  description?: string;
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}

export function SidebarTreeSection({
  title,
  defaultExpanded = true,
  children,
}: SidebarTreeSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest">
        <ChevronDown
          className={cn("h-3 w-3 transition-transform duration-200", !isOpen && "-rotate-90")}
        />
        {title}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-0.5 pb-2">
        <div className="space-y-0.5">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface TreeItemProps {
  icon?: ReactNode;
  label: string;
  meta?: string;
  onClick?: () => void;
  isActive?: boolean;
  trailing?: ReactNode;
}

export function TreeItem({ icon, label, meta, onClick, isActive, trailing }: TreeItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-sm px-4 py-1.5 text-left text-sm transition-colors",
        isActive
          ? "bg-accent/30 text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/20 hover:text-foreground"
      )}
    >
      {icon && (
        <span className="shrink-0 flex items-center justify-center opacity-70">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <span className="truncate">{label}</span>
        {meta && <span className="text-[10px] text-muted-foreground/60 truncate max-w[60px] pl-2">{meta}</span>}
      </div>
      {trailing && <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto">{trailing}</span>}
    </button>
  );
}
