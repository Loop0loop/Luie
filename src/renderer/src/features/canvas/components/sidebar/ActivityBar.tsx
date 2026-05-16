import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCanvasMode } from "../../hooks/useCanvasViewState";
import { useCanvasLayout } from "../../hooks/useCanvasLayout";
import {
  getCanvasModeMeta,
  type CanvasModeMeta,
} from "../../utils/canvasModeRegistry";

/**
 * IconBar에서 선택된 Mode의 컨트롤을 노출하는 우측 패널.
 *
 * Phase 0b: 모드 헤더(라벨 + 짧은 설명)와 collapse 토글만. Phase 1에서
 * Preset / Focus / Layer / Action 섹션이 채워진다.
 *
 * 헤더 우측 `ChevronLeft` 버튼이 ActivityBar를 접는다. 접힌 후의 펼치기는
 * IconBar의 활성 아이콘 클릭으로 자연스럽게 이뤄지므로 별도 floating
 * 버튼은 두지 않는다(IconBar는 항상 보임 = 같은 Mode 아이콘 클릭이 곧
 * 펼치기 신호).
 */
export function ActivityBar() {
  const { t } = useTranslation();
  const { mode } = useCanvasMode();
  const { setActivityCollapsed } = useCanvasLayout();
  const meta = getCanvasModeMeta(mode);

  return (
    <section
      aria-label={t(meta.labelKey)}
      className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-sidebar"
    >
      <ActivityBarHeader
        meta={meta}
        onCollapse={() => setActivityCollapsed(true)}
        collapseLabel={t("canvas.sidebar.collapse")}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[12px] text-muted">
        {/* Phase 1: Preset / Focus / Layer / Action 섹션이 들어옴. */}
        <p className="leading-relaxed">{t(meta.descriptionKey)}</p>
      </div>
    </section>
  );
}

interface ActivityBarHeaderProps {
  meta: CanvasModeMeta;
  onCollapse: () => void;
  collapseLabel: string;
}

function ActivityBarHeader({
  meta,
  onCollapse,
  collapseLabel,
}: ActivityBarHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
      <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted">
        {t(meta.labelKey)}
      </span>
      <button
        type="button"
        onClick={onCollapse}
        aria-label={collapseLabel}
        title={collapseLabel}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-md",
          "text-muted transition-colors hover:bg-surface-hover hover:text-fg",
        )}
      >
        <ChevronLeft className="size-3.5" />
      </button>
    </header>
  );
}
