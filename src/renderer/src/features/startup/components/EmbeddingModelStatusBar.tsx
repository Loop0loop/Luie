import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle, Download } from "lucide-react";
import { useModelInstallStore } from "../stores/modelInstallStore";

interface EmbeddingModelStatusBarProps {
  /**
   * inline: 위저드 본문 아래 한 줄 바(레이아웃에 참여).
   * floating: 메인 창용 하단 플로팅 필(콘텐츠를 밀어내지 않는다).
   */
  variant?: "inline" | "floating";
}

export function EmbeddingModelStatusBar({
  variant = "inline",
}: EmbeddingModelStatusBarProps) {
  const { t } = useTranslation();
  const phase = useModelInstallStore((state) => state.phase);
  const pct = useModelInstallStore((state) => state.pct);
  const error = useModelInstallStore((state) => state.error);
  const dismissed = useModelInstallStore((state) => state.dismissed);
  const initialize = useModelInstallStore((state) => state.initialize);
  const startDownload = useModelInstallStore((state) => state.startDownload);
  const restartApp = useModelInstallStore((state) => state.restartApp);
  const dismiss = useModelInstallStore((state) => state.dismiss);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (dismissed || phase === "idle" || phase === "needsDownload") {
    return null;
  }

  const shell =
    variant === "floating"
      ? "pointer-events-auto w-full rounded-control border border-border bg-panel shadow-panel"
      : "shrink-0 border-t border-border bg-panel px-4 py-2";
  const textButton =
    "shrink-0 rounded-control px-2 py-1 text-xs text-muted hover:text-fg";

  const body = (
    <aside
      className={shell}
      aria-label={t("startupWizard.onboarding.modelBarDownloading")}
    >
      {phase === "downloading" && (
        <div className="flex items-center gap-3">
          <Download className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          <div
            className="flex min-w-0 flex-1 items-center gap-2"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <span className="truncate text-xs text-muted">
              {t("startupWizard.onboarding.modelBarDownloading")}
            </span>
            <div className="h-1 min-w-8 flex-1 overflow-hidden rounded-control bg-element">
              <div
                className="h-full rounded-control bg-accent transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-subtle">
              {pct}%
            </span>
          </div>
        </div>
      )}

      {phase === "complete" && (
        <div className="flex items-center gap-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-success-fg" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">
              {t("startupWizard.onboarding.modelBarCompleteTitle")}
            </p>
            <p className="truncate text-xs text-muted">
              {t("startupWizard.onboarding.modelBarCompleteBody")}
            </p>
          </div>
          <button
            type="button"
            onClick={restartApp}
            className="shrink-0 rounded-control bg-accent px-3 py-1 text-xs text-on-accent hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.modelBarRestart")}
          </button>
          <button type="button" onClick={dismiss} className={textButton}>
            {t("startupWizard.onboarding.modelBarLater")}
          </button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-fg" aria-hidden />
          <p className="min-w-0 flex-1 truncate text-xs text-muted">
            {error ?? t("startupWizard.onboarding.modelBarError")}
          </p>
          <button
            type="button"
            onClick={startDownload}
            className="shrink-0 rounded-control bg-accent px-3 py-1 text-xs text-on-accent hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.modelBarRetry")}
          </button>
          <button type="button" onClick={dismiss} className={textButton}>
            {t("startupWizard.onboarding.modelBarLater")}
          </button>
        </div>
      )}
    </aside>
  );

  // floating 변형은 래퍼가 중앙 정렬·안전 여백을 담당하고 aside가 폭을 차지한다.
  if (variant === "floating") {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {body}
      </div>
    );
  }
  return body;
}
