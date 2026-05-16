import { useTranslation } from "react-i18next";
import { useCanvasMode } from "../../hooks/useCanvasViewState";
import { getCanvasModeMeta } from "../../utils/canvasModeRegistry";

/**
 * Stage shell — Mode dispatch + 상태 표시. PRD §7.
 *
 * Phase 0b: Mode별 view dispatcher 자리만 잡고, 본문은 EmptyState로 안내.
 * Phase 2에서 `<FlowMapView/>`, `<SceneBoardView/>` 등이 들어옴.
 *
 * Status bar / toolbar / controls는 Phase 2~3에서 추가.
 */
export function CanvasStage() {
  const { t } = useTranslation();
  const { mode } = useCanvasMode();
  const meta = getCanvasModeMeta(mode);

  return (
    <section
      aria-label={t(meta.labelKey)}
      className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-app"
    >
      {/* Phase 2: <CanvasStatusBar/> */}
      {/* Phase 2: <CanvasToolbar/> */}
      <div className="flex flex-1 min-h-0 items-center justify-center">
        <div className="flex flex-col items-center gap-1 text-[12px] text-muted">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-fg/80">
            {t(meta.labelKey)}
          </span>
          <span>{t("canvas.status.empty")}</span>
        </div>
      </div>
    </section>
  );
}
