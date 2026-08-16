import { useState, useCallback, useEffect, useRef } from 'react';
import {
  RESIZABLE_PANE_DEFAULT_RIGHT_WIDTH,
  RESIZABLE_PANE_MAX_RIGHT_WIDTH,
  RESIZABLE_PANE_MIN_RIGHT_WIDTH,
} from "@renderer/features/workspace/constants/uiDefaults";

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
}: ResizableSplitPaneProps) {
  const [rightWidth, setRightWidth] = useState(initialRightWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // NOTE: drag 상태는 ref로 읽어 mousemove마다 listener가 재등록되지 않게 한다.
  const isDraggingRef = useRef(false);

  const startResizing = useCallback(() => {
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      requestAnimationFrame(() => {
        if (!containerRef.current || !isDraggingRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.right - mouseMoveEvent.clientX;
        if (newWidth >= minRightWidth && newWidth <= maxRightWidth) {
          setRightWidth(newWidth);
        }
      });
    },
    [minRightWidth, maxRightWidth],
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
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', minWidth: 0 }}>
        {left}
      </div>

      {isRightVisible && (
        <>
          <div
            onMouseDown={startResizing}
            style={{
              width: '4px',
              cursor: 'col-resize',
              background: isDragging ? 'var(--accent-bg)' : 'transparent',
              borderLeft: '1px solid var(--border-default)',
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
