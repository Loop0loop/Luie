import { useDndMonitor } from "@dnd-kit/core";
import { useState } from "react";
import { DroppableZone } from "./DroppableZone";

export function EditorDropZones() {
  const [isDragging, setIsDragging] = useState(false);

  useDndMonitor({
    onDragStart: () => setIsDragging(true),
    onDragEnd: () => setIsDragging(false),
    onDragCancel: () => setIsDragging(false),
  });

  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-9999 flex flex-col">
      <div className="flex-1 flex relative">
          {/* Left Zone - 15% width */}
          <div className="w-[15%] h-full pointer-events-auto">
             <DroppableZone 
                id="editor-drop-zone-left" 
                className="w-full h-full"
                highlightClass="bg-accent/10 border-r-2 border-accent"
             />
          </div>

          {/* Center Zone - Flex 1 */}
          <div className="flex-1 h-full pointer-events-auto">
             <DroppableZone 
                id="editor-drop-zone-center" 
                className="w-full h-full"
                highlightClass="bg-accent/5 ring-2 ring-accent ring-inset"
             />
          </div>

          {/* Right Zone - 15% width */}
          <div className="w-[15%] h-full pointer-events-auto">
             <DroppableZone 
                id="editor-drop-zone-right" 
                className="w-full h-full"
                highlightClass="bg-accent/10 border-l-2 border-accent"
             />
          </div>
      </div>
      
      {/* Bottom Zone - 20% height */}
       <div className="h-[20%] w-full pointer-events-auto">
          <DroppableZone
             id="editor-drop-zone-bottom"
             className="w-full h-full"
             highlightClass="bg-accent/10 border-t-2 border-accent"
          />
       </div>
    </div>
  );
}
