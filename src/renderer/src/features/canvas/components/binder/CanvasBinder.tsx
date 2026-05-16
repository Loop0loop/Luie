import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { useCanvasLayout } from "../../hooks/useCanvasLayout";

/**
 * Binder shell. PRD §8.
 *
 * 헤더 우측 `ChevronRight` 버튼이 binder를 우측으로 접는다. 접힌 상태의
 * 펼치기 affordance는 stage 우측 가장자리 floating 버튼(`CanvasWorkspace`).
 *
 * Phase 1에서 다음 섹션이 차례로 들어온다:
 *   - BinderScopeSelector
 *   - BinderProjectTree
 *   - BinderCurrentFocus
 *   - BinderSelectionDetail
 *   - BinderProjectionStatus
 */
export function CanvasBinder() {
  const { t } = useTranslation();
  const { setBinderCollapsed } = useCanvasLayout();

  return (
    <aside
      aria-label={t("canvas.binder.title")}
      className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-panel"
    >
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-muted">
          {t("canvas.binder.title")}
        </span>
        <button
          type="button"
          onClick={() => setBinderCollapsed(true)}
          aria-label={t("canvas.binder.collapse")}
          title={t("canvas.binder.collapse")}
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            "text-muted transition-colors hover:bg-surface-hover hover:text-fg",
          )}
        >
          <ChevronRight className="size-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-[12px] text-muted">
        {/* Phase 1: scope / project tree / focus / selection / status */}
        <p className="leading-relaxed">{t("canvas.status.empty")}</p>
      </div>
    </aside>
  );
}
