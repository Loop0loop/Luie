import type { ReactNode } from "react";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import type { DragItemType } from "@shared/ui/GlobalDragContext";

export function BinderTabButton({
  icon,
  isActive,
  onClick,
  title,
  type,
}: {
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  title: string;
  type?: DragItemType;
}) {
  const button = (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "w-10 h-10 flex items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95",
        isActive
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
          : "text-muted hover:text-fg hover:bg-black/5 dark:hover:bg-white/5",
      )}
    >
      {icon}
    </button>
  );

  if (!type) {
    return button;
  }

  return (
    <DraggableItem
      id={`binder-icon-${type}`}
      data={{ type, id: `binder-${type}`, title }}
      className="flex items-center justify-center"
    >
      {button}
    </DraggableItem>
  );
}
