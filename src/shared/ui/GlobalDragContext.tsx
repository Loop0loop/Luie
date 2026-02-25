import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  defaultDropAnimationSideEffects,
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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
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
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({}) }}>
          {activeDragItem ? (
            <div className="bg-panel border border-accent/50 shadow-xl rounded-lg p-2 flex items-center gap-2 opacity-90 cursor-grabbing z-9999 w-max pointer-events-none">
              <span className="text-sm font-medium">{activeDragItem.title}</span>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
