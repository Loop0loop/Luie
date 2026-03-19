import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { DragData } from "@shared/ui/GlobalDragContext";
import { cn } from "@shared/types/utils";

interface DraggableItemProps {
  id: string;
  data: DragData;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * Draggable item wrapper using dnd-kit.
 * Uses activationConstraint.distance to distinguish click from drag.
 * Applies listeners only to the root element for drag detection,
 * while preserving click handlers on child elements.
 */
export function DraggableItem({
  id,
  data,
  children,
  className,
  disabled,
}: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        className,
        isDragging && "opacity-40 scale-95 transition-all duration-150",
      )}
    >
      {children}
    </div>
  );
}
