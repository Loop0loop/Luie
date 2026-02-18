import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { useUIStore } from "../../stores/uiStore";

interface GlobalDragContextProps {
  children: React.ReactNode;
}

export type DragItemType = "character" | "chapter" | "world" | "memo" | "analysis" | "synopsis" | "mindmap" | "drawing" | "plot" | "trash";

export interface DragData {
  type: DragItemType;
  id: string;
  title: string;
  [key: string]: unknown;
}

export function GlobalDragContext({ children }: GlobalDragContextProps) {
  const [activeDragItem, setActiveDragItem] = useState<DragData | null>(null);
  const { setMainView, setRightPanelContent, setSplitView, setSplitSide } = useUIStore();

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

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current) {
        setActiveDragItem(event.active.data.current as DragData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropZone = over.id as string;

    if (!dragData) return;

    // Handle Drop Logic
    if (dropZone === "editor-drop-zone-center") {
        openItemAsMain(dragData);
    } else if (dropZone === "editor-drop-zone-right") {
        openItemInSplit(dragData, "right");
    } else if (dropZone === "editor-drop-zone-left") {
        openItemInSplit(dragData, "left");
    } else if (dropZone === "editor-drop-zone-bottom") {
        openItemInSplit(dragData, "bottom"); 
    }
  };

  const openItemAsMain = (data: DragData) => {
      // Logic to open as main view
      switch (data.type) {
          case "character":
              setMainView({ type: "character", id: data.id });
              break;
          case "world":
          case "mindmap":
          case "plot":
          case "drawing":
          case "synopsis":
              setMainView({ type: "world", id: data.id }); 
              break;
          case "memo":
              setMainView({ type: "memo", id: data.id });
              break;
           case "analysis":
              setMainView({ type: "analysis", id: data.id });
              break;
          case "chapter":
              setMainView({ type: "editor", id: data.id });
              break;
          case "trash":
              setMainView({ type: "trash", id: data.id }); // Assuming trash view exists or handled
              break;
      }
  };

  const openItemInSplit = (data: DragData, side: "left" | "right" | "bottom") => {
      setSplitView(true);
      setSplitSide(side);

      switch (data.type) {
          case "character":
              setRightPanelContent({ type: "research", tab: "character", id: data.id });
              break;
          case "world":
          case "mindmap":
          case "plot":
          case "drawing":
          case "synopsis":
               // Map specific world types to tabs if needed, or just world
              setRightPanelContent({ type: "research", tab: "world", id: data.id });
              break;
          case "memo":
              setRightPanelContent({ type: "research", tab: "scrap", id: data.id }); 
              break;
          case "analysis":
              setRightPanelContent({ type: "research", tab: "analysis", id: data.id });
              break;
           case "chapter":
              setRightPanelContent({ type: "editor", id: data.id });
              break;
      }
  };

  return (
    <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
    >
      {children}
      {createPortal(
        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({}) }}>
          {activeDragItem ? (
            <div className="bg-panel border border-accent/50 shadow-xl rounded-lg p-2 flex items-center gap-2 opacity-90 cursor-grabbing z-9999">
               <span className="text-sm font-medium">{activeDragItem.title}</span>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
