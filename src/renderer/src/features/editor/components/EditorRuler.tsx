import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  EDITOR_A4_PAGE_WIDTH_PX,
  EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX,
  EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX,
  EDITOR_RULER_HEIGHT_PX,
  EDITOR_RULER_MIN_BODY_WIDTH_PX,
  EDITOR_RULER_MIN_MARGIN_PX,
  INCH_PX,
} from "@renderer/shared/constants/editorLayout";

interface EditorRulerProps {
  onMarginsChange?: (margins: { left: number; right: number; firstLineIndent: number }) => void;
}

export const EditorRuler = ({ onMarginsChange }: EditorRulerProps) => {
  const { t } = useTranslation();
  const [leftMargin, setLeftMargin] = useState(EDITOR_RULER_DEFAULT_MARGIN_LEFT_PX);
  const [rightMargin, setRightMargin] = useState(EDITOR_RULER_DEFAULT_MARGIN_RIGHT_PX);
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
            EDITOR_RULER_MIN_MARGIN_PX,
            Math.min(EDITOR_A4_PAGE_WIDTH_PX - rightMargin - EDITOR_RULER_MIN_BODY_WIDTH_PX, startValueRef.current + delta),
          );
          setLeftMargin(newVal);
          notifyChange(newVal, rightMargin, firstLineIndent);
        } else if (draggingRef.current === "right") {
          // NOTE: 오른쪽 handle은 우측 이동량과 margin 변화 방향이 반대다.
          const newVal = Math.max(
            EDITOR_RULER_MIN_MARGIN_PX,
            Math.min(EDITOR_A4_PAGE_WIDTH_PX - leftMargin - EDITOR_RULER_MIN_BODY_WIDTH_PX, startValueRef.current - delta),
          );
          setRightMargin(newVal);
          notifyChange(leftMargin, newVal, firstLineIndent);
        } else {
          // NOTE: firstLine 값은 leftMargin 기준의 상대 위치다.
          const maxFLI = EDITOR_A4_PAGE_WIDTH_PX - leftMargin - rightMargin - 48;
          const newVal = Math.max(
            -leftMargin + EDITOR_RULER_MIN_MARGIN_PX,
            Math.min(maxFLI, startValueRef.current + delta),
          );
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

  const renderTicks = () => {
    const ticks: React.ReactNode[] = [];
    const quarterInch = INCH_PX / 4;

    for (let px = 0; px <= EDITOR_A4_PAGE_WIDTH_PX; px += quarterInch) {
      const inchIdx = px / INCH_PX;
      const isInch = Math.abs(inchIdx - Math.round(inchIdx)) < 0.01;
      const isHalf = Math.abs((px % INCH_PX) - INCH_PX / 2) < 1;
      const height = isInch ? 10 : isHalf ? 7 : 4;

      const isInMargin = px < leftMargin || px > EDITOR_A4_PAGE_WIDTH_PX - rightMargin;

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

      if (isInch && px > 0 && px < EDITOR_A4_PAGE_WIDTH_PX) {
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

  const rightEdge = EDITOR_A4_PAGE_WIDTH_PX - rightMargin;

  return (
    <div
      ref={rulerRef}
      className="relative bg-app select-none overflow-visible text-xs"
      style={{ width: EDITOR_A4_PAGE_WIDTH_PX, height: EDITOR_RULER_HEIGHT_PX }}
    >
      {/* NOTE: 여백 음영은 "본문이 들어갈 수 없는 파인 면"이므로 `--bg-element`를 쓴다.
          이전에는 `--color-muted`(= `--text-secondary`, 글자색)를 배경으로 써서, 폴백이
          가리키던 밝은 회색이 아니라 짙은 회색 띠가 그려졌다. */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-element"
        style={{ width: leftMargin }}
      />
      <div
        className="absolute top-0 bottom-0 bg-element"
        style={{
          left: rightEdge,
          width: rightMargin,
        }}
      />

      {renderTicks()}


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
              className="fill-accent-bg group-hover:fill-accent-bg-hover transition-colors"
            />
          </svg>
        </div>
      </div>

      <div
        className="absolute z-10 cursor-ew-resize group"
        style={{ left: leftMargin, top: 0 }}
        onPointerDown={(e) => handlePointerDown("left", e)}
        title={t("textEditor.ruler.leftMargin")}
      >
        <div className="absolute -left-[5px] top-[8px]">
          <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
            <path
              d="M0 8L5 0L10 8Z"
              className="fill-accent-bg group-hover:fill-accent-bg-hover transition-colors"
            />
            <path
              d="M2 10H8V16H2Z"
              className="fill-accent-bg group-hover:fill-accent-bg-hover transition-colors"
            />
          </svg>
        </div>
      </div>

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
              className="fill-accent-bg group-hover:fill-accent-bg-hover transition-colors"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
