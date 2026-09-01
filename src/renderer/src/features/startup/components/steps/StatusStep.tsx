import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import type { FinalizingPhase, WizardStep } from "../../types/wizard";

interface StatusStepProps {
  step: Extract<WizardStep, "finalizing" | "error">;
  phase?: FinalizingPhase;
  errorMessage: string | null;
  onRetry: () => void;
}

export function StatusStep({
  step,
  phase = "initializing",
  errorMessage,
  onRetry,
}: StatusStepProps) {
  const { t } = useTranslation();

  const isCompleted = step === "finalizing" && phase === "completed";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <div
        className={`relative flex h-14 w-14 items-center justify-center rounded-full ${
          isCompleted ? "animate-in zoom-in-75 bg-accent/15 duration-200" : ""
        }`}
      >
        {isCompleted ? (
          <Check className="h-7 w-7 text-accent" strokeWidth={2.5} />
        ) : (
          <>
            <div className="absolute inset-0 rounded-[inherit] border-4 border-border" />
            <div
              className={`absolute inset-0 rounded-[inherit] border-4 border-transparent border-t-accent ${
                step === "finalizing" ? "animate-spin" : ""
              }`}
            />
          </>
        )}
      </div>

      <p className="text-sm text-muted">
        {step === "finalizing"
          ? phase === "completed"
            ? t("startupWizard.onboarding.initialized")
            : phase === "finishing"
              ? t("startupWizard.onboarding.finishing")
              : t("startupWizard.onboarding.initializing")
          : null}
      </p>

      {step === "error" && (
        <div className="w-full space-y-3">
          <p className="break-all text-xs text-danger-fg">
            {errorMessage ?? t("startupWizard.status.failed")}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="w-full rounded-control bg-accent px-4 py-2 text-sm text-white hover:bg-accent-bg-hover"
          >
            {t("startupWizard.actions.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
