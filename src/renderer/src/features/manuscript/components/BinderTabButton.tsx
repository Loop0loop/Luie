import { cloneElement, isValidElement, type ReactNode } from "react";
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
  // NOTE: 색상만으로 활성 상태를 표시하지 않는다. 아이콘 두께 변화 + 좌측 인디케이터 바로
  // 형태 신호를 함께 준다(GoogleDocsPanelRail과 동일 패턴).
  const renderedIcon = isValidElement<{ strokeWidth?: number }>(icon)
    ? cloneElement(icon, { strokeWidth: isActive ? 2.25 : 1.75 })
    : icon;

  const button = (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={isActive}
      className={cn(
        "relative w-10 h-10 flex items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-95",
        isActive
          ? "bg-accent/15 text-accent"
          : "text-muted hover:text-fg hover:bg-surface-hover",
      )}
    >
      {renderedIcon}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute -left-1 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent"
        />
      )}
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
