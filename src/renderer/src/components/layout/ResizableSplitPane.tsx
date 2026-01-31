import { useState, useCallback, useEffect, useRef } from 'react';
import {
  RESIZABLE_PANE_DEFAULT_RIGHT_WIDTH,
  RESIZABLE_PANE_MAX_RIGHT_WIDTH,
  RESIZABLE_PANE_MIN_RIGHT_WIDTH,
} from "../../../../shared/constants";
import { cn } from "../../../../shared/types/utils";

interface ResizableSplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;
  initialRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  isRightVisible: boolean;
  onCloseRight: () => void;
}

export default function ResizableSplitPane({
  left,
  right,
  initialRightWidth = RESIZABLE_PANE_DEFAULT_RIGHT_WIDTH,
  minRightWidth = RESIZABLE_PANE_MIN_RIGHT_WIDTH,
  maxRightWidth = RESIZABLE_PANE_MAX_RIGHT_WIDTH,
  isRightVisible,
  // onCloseRight // Not used yet
}: ResizableSplitPaneProps) {
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => {
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isDragging && containerRef.current) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          const containerRect = containerRef.current.getBoundingClientRect();
          // Calculate width from the right edge
          const newWidth = containerRect.right - mouseMoveEvent.clientX;
          
          if (newWidth >= minRightWidth && newWidth <= maxRightWidth) {
            setRightWidth(newWidth);
          }
        });
      }
    },
    [isDragging, minRightWidth, maxRightWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div 
      ref={containerRef} 
      className="flex w-full h-full overflow-hidden relative"
    >
      {/* LEFT PANE (Flexible) */}
      <div className="flex-1 h-full overflow-hidden min-w-0">
        {left}
      </div>

      {/* RIGHT PANE (Fixed width / Resizable) */}
      {isRightVisible && (
        <>
          {/* DRAG HANDLE */}
          <div
            onMouseDown={startResizing}
            className={cn(
              "w-1 cursor-col-resize z-10 shrink-0 transition-colors border-l border-border",
              "hover:bg-accent/20",
              isDragging ? "bg-accent" : "bg-transparent"
            )}
          />
          
          <div 
            style={{ width: rightWidth }}
            className="h-full overflow-hidden shrink-0 relative"
          >
             {right}
          </div>
        </>
      )}
    </div>
  );
}
