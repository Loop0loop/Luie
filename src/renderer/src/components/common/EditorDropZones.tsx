import { DroppableZone } from "./DroppableZone";

export function EditorDropZones() {
  return (
    <div className="absolute inset-0 pointer-events-none z-40 flex">
      {/* Left Zone - 20% width */}
      <div className="w-[15%] h-full pointer-events-auto">
         <DroppableZone 
            id="editor-drop-zone-left" 
            className="w-full h-full"
            highlightClass="bg-accent/10 border-r-2 border-accent"
         />
      </div>

      {/* Center Zone - 70% width */}
      <div className="flex-1 h-full pointer-events-auto">
         <DroppableZone 
            id="editor-drop-zone-center" 
            className="w-full h-full"
            highlightClass="bg-accent/5 ring-2 ring-accent ring-inset"
         />
      </div>

      {/* Right Zone - 20% width */}
      <div className="w-[15%] h-full pointer-events-auto">
         <DroppableZone 
            id="editor-drop-zone-right" 
            className="w-full h-full"
            highlightClass="bg-accent/10 border-l-2 border-accent"
         />
      </div>
    </div>
  );
}
