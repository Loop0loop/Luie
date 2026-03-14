import React, { useMemo, useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { api } from "@shared/api";

export type DragItemType = "character" | "chapter" | "world" | "event" | "faction" | "memo" | "analysis" | "synopsis" | "mindmap" | "drawing" | "plot" | "trash" | "snapshot";

export interface DragData {
  type: DragItemType;
  id: string;
  title: string;
  [key: string]: unknown;
}

interface GlobalDragContextProps {
  children: React.ReactNode;
  /** 에디터 중앙에 드롭 시 호출 — uiMode별 핸들러를 App에서 전달 */
  onDropToCenter?: (data: DragData) => void;
  /** 좌/우/하단 분할 영역에 드롭 시 호출 */
  onDropToSplit?: (data: DragData, side: "left" | "right" | "bottom") => void;
}

export function GlobalDragContext({ children, onDropToCenter, onDropToSplit }: GlobalDragContextProps) {
  const [activeDragItem, setActiveDragItem] = useState<DragData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  const overlay = useMemo(
    () =>
      activeDragItem ? (
        <div className="pointer-events-none z-9999 flex w-max items-center gap-2 rounded-lg border border-accent/50 bg-panel/95 p-2 text-sm font-medium opacity-95 shadow-xl will-change-transform [transform:translate3d(0,0,0)]">
          <span>{activeDragItem.title}</span>
        </div>
      ) : null,
    [activeDragItem],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (event.active.data.current) {
      const data = event.active.data.current as DragData;
      api.logger.info("Drag started", { type: data.type, id: data.id });
      setActiveDragItem(data);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) {
      api.logger.info("Drag ended with no drop target");
      return;
    }

    const dragData = active.data.current as DragData;
    const dropZone = over.id as string;

    api.logger.info("Drag dropped", { dropZone, dragData });

    if (!dragData) return;

    if (dropZone === "editor-drop-zone-center") {
      onDropToCenter?.(dragData);
    } else if (dropZone === "editor-drop-zone-right") {
      onDropToSplit?.(dragData, "right");
    }
  }, [onDropToCenter, onDropToSplit]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
      {createPortal(
        <DragOverlay dropAnimation={null}>{overlay}</DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
