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
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data,
    disabled,
  });

  /* NOTE: dnd-kit의 `attributes`를 **일부러 스프레드하지 않는다**(§11-9).
     그 안에는 `role="button"` + `tabIndex={0}`이 들어 있어 이 wrapper가 키보드 focus를
     받게 되는데, 이 앱에서는 그것이 전부 손해다.

     ① `GlobalDragContext`가 `PointerSensor`만 등록한다 — **`KeyboardSensor`가 없다.**
        즉 그 `tabIndex`로 할 수 있는 일이 없다
     ② dnd-kit은 키보드 활성화 핸들러를 붙이지 않고, `role="button"`인 `<div>`는 Enter로
        click이 합성되지 않는다. 실제 `onClick`은 내부 요소에 있으므로 **focus는 가는데
        조작은 안 되는 stop**이 된다
     ③ 소비처 12곳 중 5곳(`SidebarChapterList`·`SidebarWorldList`·`SnapshotList`·
        `TrashList`·`GoogleDocsPanelRail`)은 내부에 진짜 `<button>`이 있어 **tab이 2중으로**
        걸렸다(사용자 지적)
     ④ `role="button"`은 스크린리더에 "버튼"이라고 알리는데 활성화가 안 되므로 오정보다

     따라서 focus 표시를 주는 것이 아니라 **tab 순서에서 빼는 것**이 맞다. 직전 작업에서
     여기에 `ring-inset`을 넣었는데, 존재하면 안 되는 stop을 칠한 것이었으므로 되돌렸다.

     남은 부채: 내부가 `<div onClick>`인 7곳은 키보드로 도달할 수 없다 — 다만 그것은
     **이 변경으로 생긴 것이 아니다.** 이전에도 Enter가 동작하지 않았으므로 실질 손실은 없다.
     그 행들을 `<button>`으로 바꾸는 것은 별도 항목으로 둔다(`ui-todo.md` §11-9).

     키보드 드래그를 넣게 되면 `KeyboardSensor` 등록과 함께 `attributes`를 되살리고
     `aria-roledescription` 안내도 붙여야 한다. */

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={cn(
        className,
        isDragging && "opacity-40 scale-95 transition-all duration-150",
      )}
    >
      {children}
    </div>
  );
}
