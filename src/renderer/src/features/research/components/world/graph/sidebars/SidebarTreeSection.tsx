import React from "react";
import type { ReactNode } from "react";
import { ChevronRight, FolderOpen, Folder } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@renderer/components/ui/collapsible";
import { cn } from "@renderer/lib/utils";
import { useState } from "react";

// Professional Sidebar Collapsible Section (Like Linear / Notion)
interface SidebarTreeSectionProps {
  title: string;
  defaultExpanded?: boolean;
  actionIcon?: ReactNode;
  onAction?: (e: React.MouseEvent) => void;
  children: ReactNode;
}

export function SidebarTreeSection({
  title,
  defaultExpanded = true,
  actionIcon,
  onAction,
  children,
}: SidebarTreeSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <div className="group flex items-center justify-between px-3 py-1.5 cursor-pointer">
        <CollapsibleTrigger className="flex flex-1 items-center gap-1.5 outline-none">
          <ChevronRight 
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200", 
              isOpen && "rotate-90"
            )} 
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.03em] text-muted-foreground/80 select-none group-hover:text-foreground/80 transition-colors">
            {title}
          </span>
        </CollapsibleTrigger>
        {actionIcon && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(e);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted/80 rounded-[4px] text-muted-foreground hover:text-foreground transition-all duration-150"
          >
            {actionIcon}
          </button>
        )}
      </div>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <div className="px-2 pt-0.5 pb-1 flex flex-col gap-[2px]">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Highly polished Tree Item (Supports files/folders naturally)
interface TreeItemProps {
  icon?: ReactNode;
  label: string;
  meta?: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  isFolder?: boolean;
  isOpen?: boolean;
  children?: ReactNode;
  depth?: number;
}

export function TreeItem({ 
  icon, 
  label, 
  meta, 
  onClick, 
  isActive, 
  isFolder, 
  isOpen, 
  children,
  depth = 0 
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(isOpen || false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      setExpanded(!expanded);
    }
    if (onClick) onClick();
  };

  const renderIcon = () => {
    if (icon) return icon;
    if (isFolder) {
      return expanded ? (
        <FolderOpen className="h-[15px] w-[15px] text-muted-foreground/80" strokeWidth={1.5} />
      ) : (
        <Folder className="h-[15px] w-[15px] text-muted-foreground/80" strokeWidth={1.5} />
      );
    }
    return null;
  };

  const paddingLeft = depth * 12 + 6; // Standard visual indent for professional trees

  return (
    <div className="w-full relative">
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '8px' }}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md py-[5px] text-left text-[13px] cursor-pointer outline-none transition-all duration-100",
          isActive
            ? "bg-accent text-accent-foreground font-medium shadow-[0_1px_2px_rgba(0,0,0,0.03)]" // In macOS/Linear, selected items often pop out slightly
            : "text-foreground/80 font-normal hover:bg-muted/60 active:bg-muted"
        )}
      >
        <div className="shrink-0 w-[14px] flex items-center justify-center">
          {isFolder ? (
            <ChevronRight 
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-transform duration-150",
                expanded && "rotate-90"
              )} 
            />
          ) : null}
        </div>
        
        {renderIcon() && (
          <div className="shrink-0 flex items-center">
            {renderIcon()}
          </div>
        )}
        
        <span className="truncate select-none flex-1 leading-tight">{label}</span>
        
        {meta && (
          <span className="shrink-0 text-[11px] font-medium text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity">
            {meta}
          </span>
        )}
      </div>

      {isFolder && expanded && children && (
         <div className="mt-[2px] flex flex-col gap-[2px] relative">
           {/* Connecting line for folders (Subtle Mac style) */}
           <div 
             className="absolute left-[20px] top-0 bottom-0 w-px bg-border/10 pointer-events-none" 
             style={{ left: `${paddingLeft + 14}px` }} 
           />
           {React.Children.map(children, child => {
             if (React.isValidElement(child)) {
               return React.cloneElement(child, { depth: depth + 1 } as Partial<TreeItemProps>);
             }
             return child;
           })}
         </div>
      )}
    </div>
  );
}
