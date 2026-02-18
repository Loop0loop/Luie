import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

// A4 @ 96 DPI
const PAGE_WIDTH_PX = 794;
const DEFAULT_MARGIN_LEFT = 96; // 1 inch
const DEFAULT_MARGIN_RIGHT = 96; // 1 inch
const INCH_PX = 96; // 1 inch = 96px at 96 DPI
const RULER_HEIGHT = 24;
const MIN_MARGIN = 24; // Minimum margin ~0.25 inch
const MIN_BODY_WIDTH = 200; // Minimum content area width

interface EditorRulerProps {
  onMarginsChange?: (margins: { left: number; right: number; firstLineIndent: number }) => void;
}

export const EditorRuler = ({ onMarginsChange }: EditorRulerProps) => {
  const { t } = useTranslation();
  const [leftMargin, setLeftMargin] = useState(DEFAULT_MARGIN_LEFT);
  const [rightMargin, setRightMargin] = useState(DEFAULT_MARGIN_RIGHT);
  const [firstLineIndent, setFirstLineIndent] = useState(0);

  const rulerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"left" | "right" | "firstLine" | null>(null);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);

  const notifyChange = useCallback(
    (left: number, right: number, fli: number) => {
      onMarginsChange?.({ left, right, firstLineIndent: fli });
    },
    [onMarginsChange],
  );

  const handlePointerDown = useCallback(
    (type: "left" | "right" | "firstLine", e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingRef.current = type;
      startXRef.current = e.clientX;

      if (type === "left") startValueRef.current = leftMargin;
      else if (type === "right") startValueRef.current = rightMargin;
      else startValueRef.current = firstLineIndent;

      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";

      const handlePointerMove = (me: PointerEvent) => {
        if (!draggingRef.current) return;
        const delta = me.clientX - startXRef.current;

        if (draggingRef.current === "left") {
          const newVal = Math.max(
            MIN_MARGIN,
            Math.min(PAGE_WIDTH_PX - rightMargin - MIN_BODY_WIDTH, startValueRef.current + delta),
          );
          setLeftMargin(newVal);
          notifyChange(newVal, rightMargin, firstLineIndent);
        } else if (draggingRef.current === "right") {
          // Right margin: dragging right = less margin, dragging left = more margin
          const newVal = Math.max(
            MIN_MARGIN,
            Math.min(PAGE_WIDTH_PX - leftMargin - MIN_BODY_WIDTH, startValueRef.current - delta),
          );
          setRightMargin(newVal);
          notifyChange(leftMargin, newVal, firstLineIndent);
        } else {
          // firstLine is relative to leftMargin
          const maxFLI = PAGE_WIDTH_PX - leftMargin - rightMargin - 48;
          const newVal = Math.max(-leftMargin + MIN_MARGIN, Math.min(maxFLI, startValueRef.current + delta));
          setFirstLineIndent(newVal);
          notifyChange(leftMargin, rightMargin, newVal);
        }
      };

      const handlePointerUp = () => {
        draggingRef.current = null;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [leftMargin, rightMargin, firstLineIndent, notifyChange],
  );

  // Ticks & Numbers
  const renderTicks = () => {
    const ticks: React.ReactNode[] = [];
    const quarterInch = INCH_PX / 4; // 24px

    for (let px = 0; px <= PAGE_WIDTH_PX; px += quarterInch) {
      const inchIdx = px / INCH_PX;
      const isInch = Math.abs(inchIdx - Math.round(inchIdx)) < 0.01;
      const isHalf = Math.abs((px % INCH_PX) - INCH_PX / 2) < 1;
      const height = isInch ? 10 : isHalf ? 7 : 4;

      const isInMargin = px < leftMargin || px > PAGE_WIDTH_PX - rightMargin;

      ticks.push(
        <div
          key={`t-${px}`}
          className="absolute bottom-0 pointer-events-none"
          style={{
            left: px,
            height,
            width: 1,
            backgroundColor: isInMargin
              ? "var(--color-foreground, #444)" // margin ticks dimmer
              : "var(--color-foreground, #444)",
            opacity: isInMargin ? 0.2 : 0.4,
          }}
        />,
      );

      // Numbers at every inch (skip 0)
      if (isInch && px > 0 && px < PAGE_WIDTH_PX) {
        const inchNum = Math.round(inchIdx);
        ticks.push(
          <div
            key={`n-${px}`}
            className="absolute select-none pointer-events-none"
            style={{
              left: px,
              top: 1,
              fontSize: 9,
              lineHeight: "12px",
              transform: "translateX(-50%)",
              color: isInMargin
                ? "var(--color-muted-foreground, #999)"
                : "var(--color-muted-foreground, #666)",
              opacity: isInMargin ? 0.3 : 0.7,
            }}
          >
            {inchNum}
          </div>,
        );
      }
    }
    return ticks;
  };

  const rightEdge = PAGE_WIDTH_PX - rightMargin;

  return (
    <div
      ref={rulerRef}
      className="relative bg-background select-none overflow-visible text-xs"
      style={{ width: PAGE_WIDTH_PX, height: RULER_HEIGHT }}
    >
      {/* Gray backgrounds for margins */}
      <div
        className="absolute top-0 bottom-0 left-0"
        style={{
          width: leftMargin,
          backgroundColor: "var(--color-muted, #e0e0e0)",
          opacity: 0.3,
        }}
      />
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: rightEdge,
          width: rightMargin,
          backgroundColor: "var(--color-muted, #e0e0e0)",
          opacity: 0.3,
        }}
      />

      {/* Ticks & Numbers */}
      {renderTicks()}

      {/* === MARKERS === */}

      {/* First Line Indent — Down-pointing triangle at top */}
      <div
        className="absolute z-20 cursor-ew-resize group"
        style={{ left: leftMargin + firstLineIndent, top: 0 }}
        onPointerDown={(e) => handlePointerDown("firstLine", e)}
        title={t("textEditor.ruler.firstLineIndent")}
      >
        <div className="absolute -left-[5px] top-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M0 0H10L5 8Z"
              className="fill-[#0b57d0] group-hover:fill-[#1a73e8] transition-colors"
            />
          </svg>
        </div>
      </div>

      {/* Left Indent — Up-pointing triangle + rectangle at bottom */}
      <div
        className="absolute z-10 cursor-ew-resize group"
        style={{ left: leftMargin, top: 0 }}
        onPointerDown={(e) => handlePointerDown("left", e)}
        title={t("textEditor.ruler.leftMargin")}
      >
        <div className="absolute -left-[5px] top-[8px]">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            {/* Up triangle */}
            <path
              d="M0 8L5 0L10 8Z"
              className="fill-[#0b57d0] group-hover:fill-[#1a73e8] transition-colors"
            />
            {/* Rectangle */}
            <path
              d="M2 10H8V16H2Z"
              className="fill-[#0b57d0] group-hover:fill-[#1a73e8] transition-colors"
            />
          </svg>
        </div>
      </div>

      {/* Right Indent — Up-pointing triangle at bottom */}
      <div
        className="absolute z-10 cursor-ew-resize group"
        style={{ left: rightEdge, top: 0 }}
        onPointerDown={(e) => handlePointerDown("right", e)}
        title={t("textEditor.ruler.rightMargin")}
      >
        <div className="absolute -left-[5px] top-[12px]">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
            <path
              d="M0 12L5 0L10 12Z"
              className="fill-[#0b57d0] group-hover:fill-[#1a73e8] transition-colors"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
