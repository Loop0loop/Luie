import { useState, useCallback, useEffect, useRef } from 'react';
import {
  RESIZABLE_PANE_DEFAULT_RIGHT_WIDTH,
  RESIZABLE_PANE_MAX_RIGHT_WIDTH,
  RESIZABLE_PANE_MIN_RIGHT_WIDTH,
} from "../../../../shared/constants";

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
      style={{ display: 'flex', width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}
    >
      {/* LEFT PANE (Flexible) */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0 }}>
        {left}
      </div>

      {/* RIGHT PANE (Fixed width / Resizable) */}
      {isRightVisible && (
        <>
          {/* DRAG HANDLE */}
          <div
            onMouseDown={startResizing}
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: isDragging ? '#10B981' : 'transparent',
              borderLeft: '1px solid #E5E5E5',
              transition: 'background 0.2s',
              zIndex: 10,
              flexShrink: 0,
            }}
            className="group hover:bg-emerald-500/20"
          />
          
          <div style={{ width: rightWidth, height: '100%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
             {right}
          </div>
        </>
      )}
    </div>
  );
}
