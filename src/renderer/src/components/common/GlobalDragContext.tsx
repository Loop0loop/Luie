import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { useUIStore } from "../../stores/uiStore";

interface GlobalDragContextProps {
  children: React.ReactNode;
}

export type DragItemType = "character" | "chapter" | "world" | "memo";

export interface DragData {
  type: DragItemType;
  id: string;
  title: string;
  [key: string]: any;
}

export function GlobalDragContext({ children }: GlobalDragContextProps) {
  const [activeDragItem, setActiveDragItem] = useState<DragData | null>(null);
  const { setMainView, setRightPanelContent, setSplitView, setSplitSide } = useUIStore();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Must drag 10px to start (prevents accidental clicks)
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
        // Open as Main View
        openItemAsMain(dragData);
    } else if (dropZone === "editor-drop-zone-right") {
        // Open in Split View (Right)
        openItemInSplit(dragData, "right");
    } else if (dropZone === "editor-drop-zone-left") {
        // Open in Split View (Left)
        openItemInSplit(dragData, "left");
    }
  };

  const openItemAsMain = (data: DragData) => {
      switch (data.type) {
          case "character":
              // For now, character view is 'character' type. 
              // We might need to set a specific ID in the store if we support detailing a specific char in main view.
              // Assuming 'character' main view shows the list or last selected.
              // Actually, looking at WikiDetailView, it likely needs a way to know WHICH character.
              // We'll update UI store to support ID if needed, or just switch view.
              setMainView({ type: "character", id: data.id });
              break;
          case "world":
              setMainView({ type: "world", id: data.id }); // Assuming ID handles specific term/tab
              break;
          case "memo":
              setMainView({ type: "memo", id: data.id });
              break;
          case "chapter":
              setMainView({ type: "editor", id: data.id }); // Standard editor
              break;
      }
  };

  const openItemInSplit = (data: DragData, side: "left" | "right") => {
      setSplitView(true);
      setSplitSide(side === "left" ? "right" : "left"); // existing split side logic is "which side is the SECONDARY panel"
      // If we drop on RIGHT, we want secondary panel on RIGHT.
      // If we drop on LEFT, we want secondary panel on LEFT.
      
      // Update: UI Store `splitSide` defines where the SECONDARY pane is.
      // So if I drop on "right", `splitSide` should be "right".
      setSplitSide(side);

      switch (data.type) {
          case "character":
              setRightPanelContent({ type: "research", tab: "character", id: data.id });
              break;
          case "world":
              setRightPanelContent({ type: "research", tab: "world", id: data.id });
              break;
          case "memo":
              setRightPanelContent({ type: "research", tab: "scrap", id: data.id }); // scrap = memo
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
            <div className="bg-panel border border-accent/50 shadow-xl rounded-lg p-2 flex items-center gap-2 opacity-90 cursor-grabbing">
               <span className="text-sm font-medium">{activeDragItem.title}</span>
            </div>
          ) : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
