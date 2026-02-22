import { useDndMonitor } from "@dnd-kit/core";
import { useState } from "react";
import { DroppableZone } from "@shared/ui/DroppableZone";

export function EditorDropZones() {
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragOver: (event) => {
      setActiveDropZone(event.over?.id ? String(event.over.id) : null);
    },
    onDragEnd: () => {
      setIsDragging(false);
      setActiveDropZone(null);
    },
    onDragCancel: () => {
      setIsDragging(false);
      setActiveDropZone(null);
    },
  });

  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-9999 flex flex-col">

      {/* Visual Overlay using absolute positioning based on activeDropZone */}
      {activeDropZone === "editor-drop-zone-right" && (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-accent/20 border-l-2 border-accent/80 transition-all duration-200 backdrop-blur-[2px] z-40 flex items-center justify-center pointer-events-none shadow-xl">
          <span className="text-accent font-bold text-sm bg-panel/90 px-4 py-2 rounded-full shadow-md border border-accent/30">
            Drop to Split Right
          </span>
        </div>
      )}

      {activeDropZone === "editor-drop-zone-center" && (
        <div className="absolute inset-0 bg-accent/10 ring-4 ring-accent/60 ring-inset transition-all duration-200 backdrop-blur-[1px] z-40 flex items-center justify-center pointer-events-none">
          <span className="text-accent font-bold text-sm bg-panel/90 px-4 py-2 rounded-full shadow-md border border-accent/30">
            Drop to Open Here
          </span>
        </div>
      )}

      {/* Invisible Interactive Hit Areas - Only Center and Right remain to match App.tsx split support */}
      <div className="flex-1 flex relative z-50 h-full">
        <div className="flex-1 h-full pointer-events-auto">
          <DroppableZone id="editor-drop-zone-center" className="w-full h-full" highlightClass="" disableOverlay />
        </div>

        <div className="w-[30%] h-full pointer-events-auto">
          <DroppableZone id="editor-drop-zone-right" className="w-full h-full" highlightClass="" disableOverlay />
        </div>
      </div>
    </div>
  );
}
