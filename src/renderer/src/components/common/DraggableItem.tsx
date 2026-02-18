import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";
import { DragData } from "./GlobalDragContext";
import { cn } from "../../../../shared/types/utils";

interface DraggableItemProps {
  id: string;
  data: DragData;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function DraggableItem({ id, data, children, className, disabled }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data,
    disabled
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(className, isDragging && "opacity-50 grayscale")}
    >
      {children}
    </div>
  );
}
