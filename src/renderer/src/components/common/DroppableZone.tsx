import { useDroppable } from "@dnd-kit/core";
import { cn } from "../../../../shared/types/utils";
import React from "react";

interface DroppableZoneProps {
  id: string;
  children?: React.ReactNode;
  className?: string;
  highlightClass?: string;
  disableOverlay?: boolean;
}

export function DroppableZone({ 
  id, 
  children, 
  className, 
  highlightClass = "bg-accent/10 border-accent",
  disableOverlay = false 
}: DroppableZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200", 
        className,
        isOver && highlightClass,
        isOver && !disableOverlay && "relative z-50 ring-2 ring-accent ring-inset"
      )}
    >
      {/* Visual Overlay when hovering */}
      {isOver && !disableOverlay && (
           <div className="absolute inset-0 bg-accent/5 pointer-events-none flex items-center justify-center z-50">
               <span className="text-accent font-bold text-sm bg-panel/90 px-3 py-1 rounded-full shadow-sm backdrop-blur border border-accent/20">
                   Drop to Open
               </span>
           </div>
      )}
      {children}
    </div>
  );
}
