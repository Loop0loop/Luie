import { useState, useCallback, useEffect, useRef } from 'react';
import {
  RESIZABLE_PANE_DEFAULT_RIGHT_WIDTH,
  RESIZABLE_PANE_MAX_RIGHT_WIDTH,
  RESIZABLE_PANE_MIN_RIGHT_WIDTH,
} from "@shared/constants";

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

  // ✅ P2 Fix: Store isDragging in a ref so the mousemove handler always reads
  // the latest value without causing the resize callback to be recreated on every drag tick.
  // This prevents the useEffect from repeatedly removing and re-adding window listeners.
  const isDraggingRef = useRef(false);

  const startResizing = useCallback(() => {
    isDraggingRef.current = true;
    setIsDragging(true);
  }, []);

  const stopResizing = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  // ✅ resize no longer depends on isDragging state — reads ref instead
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

  // ✅ Now resize/stopResizing are stable references — listeners registered once
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
              borderLeft: '1px solid var(--border)',
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
