/**
 * CanvasToolbar — canvas 뷰포트 상단 크롬.
 *
 * SRP:
 *   - 상수(MODE_I18N, RANGE_I18N 등)는 constants/index.ts에 위치합니다.
 *   - 이 컴포넌트는 렌더링과 인터랙션만 담당합니다.
 */

import { useTranslation } from "react-i18next";
import { CANVAS_TOOLBAR_HEIGHT_PX } from "@shared/constants/layoutSizing";




// ─── main component ───────────────────────────────────────────────────────────

export default function CanvasToolbar() {
  const { t } = useTranslation();

  return (
    <div
      className="flex shrink-0 items-center border-b border-border/40 bg-sidebar px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80"
      style={{ height: CANVAS_TOOLBAR_HEIGHT_PX }}
      data-testid="canvas-toolbar"
    >
      {t("canvas.workspace.title")}
    </div>
  );
}
