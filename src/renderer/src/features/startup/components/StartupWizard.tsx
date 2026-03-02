import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";

type BootPhase = "configuring" | "launching" | "error";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export default function StartupWizard() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<BootPhase>("configuring");
  const [statusMessage, setStatusMessage] = useState<string>(
    t("startupWizard.status.configuring", {
      defaultValue: "앱 구성중입니다...",
    }),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const runStartupFlow = useCallback(async () => {
    setPhase("configuring");
    setErrorMessage(null);
    setStatusMessage(
      t("startupWizard.status.configuring", {
        defaultValue: "앱 구성중입니다...",
      }),
    );

    const readinessResponse = await api.startup.getReadiness();
    if (!readinessResponse.success || !readinessResponse.data) {
      throw new Error(
        readinessResponse.error?.message ?? "Failed to evaluate startup readiness",
      );
    }

    if (readinessResponse.data.mustRunWizard) {
      const completeResponse = await api.startup.completeWizard();
      if (!completeResponse.success || !completeResponse.data) {
        throw new Error(
          completeResponse.error?.message ?? "Failed to complete startup configuration",
        );
      }
      if (completeResponse.data.mustRunWizard) {
        const unresolved = completeResponse.data.reasons.join(", ");
        throw new Error(`STARTUP_PENDING_CHECKS:${unresolved || "unknown"}`);
      }
    }

    setPhase("launching");
    setStatusMessage(
      t("startupWizard.status.launching", {
        defaultValue: "메인 화면을 여는 중입니다...",
      }),
    );
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await runStartupFlow();
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setErrorMessage(getErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attempt, runStartupFlow]);

  const isBusy = phase !== "error";

  return (
    <div className="min-h-screen bg-app text-fg flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel shadow-xl p-8">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 rounded-full border-4 border-border/60" />
            <div
              className={`absolute inset-0 rounded-full border-4 border-transparent border-t-accent ${
                isBusy ? "animate-spin" : ""
              }`}
            />
          </div>

          <h1 className="text-xl font-semibold">
            {t("startupWizard.title", { defaultValue: "앱 구성중입니다" })}
          </h1>
          <p className="text-sm text-muted">
            {t("startupWizard.subtitle", {
              defaultValue: "필수 구성을 확인하고 있어요. 잠시만 기다려 주세요.",
            })}
          </p>

          <div className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {statusMessage}
          </div>

          {phase === "error" && (
            <div className="w-full space-y-3">
              <p className="text-xs text-danger-fg break-all">
                {errorMessage ??
                  t("startupWizard.status.failed", {
                    defaultValue: "시작 구성에 실패했습니다.",
                  })}
              </p>
              <button
                type="button"
                onClick={() => setAttempt((prev) => prev + 1)}
                className="w-full rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90"
              >
                {t("startupWizard.actions.retry", { defaultValue: "다시 시도" })}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
