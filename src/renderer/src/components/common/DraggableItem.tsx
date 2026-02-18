import { useDraggable } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type { DragData } from "./GlobalDragContext";
import { cn } from "../../../../shared/types/utils";

interface DraggableItemProps {
  id: string;
  data: DragData;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

/**
 * 드래그 가능한 아이템 래퍼.
 * - 드래그 리스너를 최상위 div에 바인딩하되, transform은 적용하지 않음
 *   (DragOverlay가 시각적 피드백을 담당)
 * - MouseSensor의 activationConstraint.distance로 클릭과 드래그 구분
 */
export function DraggableItem({ id, data, children, className, disabled }: DraggableItemProps) {
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
      className={cn(className, isDragging && "opacity-40 scale-95 transition-all duration-150")}
    >
      {children}
    </div>
  );
}
