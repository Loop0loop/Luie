/**
 * CanvasFloatingToolbar — 동적/정적 캔버스 공통 우측 플로팅 툴바.
 *
 * Obsidian Canvas 스타일 — 뷰포트 수직 중앙 배치.
 * useReactFlow()를 사용하므로 반드시 <ReactFlow> 내부에 렌더링해야 합니다.
 *
 * 버튼 구성:
 *   설정 (UI only)
 *   ─────
 *   줌인 / 줌 리셋 / 핏뷰 / 줌아웃
 *   ─────
 *   실행취소 / 다시실행 (UI only, disabled)
 *   ─────
 *   도움말 (UI only)
 */

import { useTranslation } from "react-i18next";
import {
  HelpCircle,
  Maximize2,
  Minus,
  MoreHorizontal,
  Redo2,
  RotateCcw,
  Settings,
  Undo2,
  ZoomIn,
} from "lucide-react";
import { useReactFlow } from "reactflow";
import { cn } from "@shared/types/utils";
import { CANVAS_FIT_VIEW_PADDING } from "@shared/constants/canvasSizing";

// h-9 w-9 — 이전 h-7보다 크게, 아이콘도 h-4.5로 업
const BTN =
  "flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-hover hover:text-fg";

const DIVIDER = "my-1 h-px w-5 bg-border/40";

export function CanvasFloatingToolbar() {
  const { t } = useTranslation();
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();

  return (
    // top-1/2 -translate-y-1/2 으로 뷰포트 수직 중앙 배치
    // React-Flow Panel 컴포넌트를 쓰지 않고 absolute로 직접 배치해
    // 정확한 중앙 정렬을 보장합니다.
    <div
      className="pointer-events-auto absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-xl border border-border/40 bg-panel/95 p-1.5 shadow-panel backdrop-blur-sm"
      data-testid="canvas-floating-toolbar"
    >
      {/* 드래그 그립 핸들 */}
      <div className="flex h-4 items-center justify-center" aria-hidden>
        <MoreHorizontal className="h-3.5 w-3.5 text-muted/40" />
      </div>

      <button
        type="button"
        title={t("canvas.toolbar.settings")}
        className={BTN}
        onClick={() => undefined}
      >
        <Settings className="h-4.5 w-4.5" />
      </button>

      <div className={DIVIDER} aria-hidden />

      <button
        type="button"
        title={t("canvas.toolbar.zoomIn")}
        className={BTN}
        onClick={() => zoomIn({ duration: 200 })}
      >
        <ZoomIn className="h-4.5 w-4.5" />
      </button>

      <button
        type="button"
        title={t("canvas.toolbar.resetZoom")}
        className={BTN}
        onClick={() => zoomTo(1, { duration: 200 })}
      >
        <RotateCcw className="h-4.5 w-4.5" />
      </button>

      <button
        type="button"
        title={t("canvas.toolbar.fitView")}
        className={BTN}
        onClick={() => fitView({ padding: CANVAS_FIT_VIEW_PADDING, duration: 300 })}
      >
        <Maximize2 className="h-4.5 w-4.5" />
      </button>

      <button
        type="button"
        title={t("canvas.toolbar.zoomOut")}
        className={BTN}
        onClick={() => zoomOut({ duration: 200 })}
      >
        <Minus className="h-4.5 w-4.5" />
      </button>

      <div className={DIVIDER} aria-hidden />

      <button
        type="button"
        title={t("canvas.toolbar.undo")}
        className={cn(BTN, "cursor-not-allowed opacity-35")}
        disabled
      >
        <Undo2 className="h-4.5 w-4.5" />
      </button>

      <button
        type="button"
        title={t("canvas.toolbar.redo")}
        className={cn(BTN, "cursor-not-allowed opacity-35")}
        disabled
      >
        <Redo2 className="h-4.5 w-4.5" />
      </button>

      <div className={DIVIDER} aria-hidden />

      <button
        type="button"
        title={t("canvas.toolbar.help")}
        className={BTN}
        onClick={() => undefined}
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
