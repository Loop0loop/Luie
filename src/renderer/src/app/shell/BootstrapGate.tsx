import { useTranslation } from "react-i18next";

import type { AppBootstrapStatus } from "@shared/types/index.js";

export function BootstrapGate({
  bootstrapStatus,
  isBootstrapLoading,
  onQuit,
  onRetry,
}: {
  bootstrapStatus: AppBootstrapStatus;
  isBootstrapLoading: boolean;
  onQuit: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const showError = Boolean(bootstrapStatus.error) && !isBootstrapLoading;

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-panel p-8 shadow-lg">
        <div className="space-y-4">
          <div className="h-6 w-52 rounded-md bg-surface animate-pulse" />
          <div className="h-4 w-full rounded-md bg-surface animate-pulse" />
          <div className="h-4 w-[82%] rounded-md bg-surface animate-pulse" />
          <div className="h-4 w-[68%] rounded-md bg-surface animate-pulse" />
        </div>

        {!showError && (
          <p className="mt-6 text-sm text-muted">
            {t("bootstrap.initializing")}
          </p>
        )}

        {showError && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-danger-fg">{bootstrapStatus.error}</p>
            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
              >
                {t("bootstrap.retry")}
              </button>
              <button
                onClick={onQuit}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-fg hover:bg-surface-hover transition-colors"
              >
                {t("bootstrap.quit")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
