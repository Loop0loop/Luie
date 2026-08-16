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

/** root에만 drag listener를 연결해 child의 click handler와 충돌하지 않게 한다. */
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
