import { useTranslation } from "react-i18next";
import { Brain, Check } from "lucide-react";
import { useModelInstallStore } from "../../stores/modelInstallStore";

const BENEFIT_KEYS = [
  "startupWizard.onboarding.modelBenefitMemory",
  "startupWizard.onboarding.modelBenefitCharacter",
  "startupWizard.onboarding.modelBenefitContinue",
] as const;

interface ModelStepProps {
  /** 다운로드 완료 여부와 무관하게 다음 단계(테마)로 진행한다. */
  onContinue: () => void;
}

export function ModelStep({ onContinue }: ModelStepProps) {
  const { t } = useTranslation();
  const phase = useModelInstallStore((state) => state.phase);
  const pct = useModelInstallStore((state) => state.pct);
  const startDownload = useModelInstallStore((state) => state.startDownload);

  const isReady = phase === "complete" || phase === "idle";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-control bg-accent/10 text-accent">
          <Brain className="h-8 w-8" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">
            {t("startupWizard.onboarding.modelTitle")}
          </h1>
          {/* 본문은 로케일 문자열의 줄바꿈 단위로 문단을 나눠 읽히게 한다. */}
          <div className="space-y-1 text-sm leading-relaxed text-muted">
            {t("startupWizard.onboarding.modelBody")
              .split("\n")
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </div>
        <ul className="space-y-1.5">
          {BENEFIT_KEYS.map((key) => (
            <li key={key} className="flex items-center gap-2 text-sm">
              <Check className="h-3.5 w-3.5 text-success-fg" aria-hidden />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        {phase === "needsDownload" && (
          <p className="text-xs text-subtle">
            {t("startupWizard.onboarding.modelSizeNote")}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {phase === "needsDownload" && (
          <button
            type="button"
            onClick={startDownload}
            className="w-full rounded-control bg-accent px-6 py-2.5 text-sm text-white hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.modelCta")}
          </button>
        )}

        {phase === "downloading" && (
          <div className="space-y-2">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="space-y-2"
            >
              <div className="flex items-baseline justify-between text-xs text-muted">
                <span>{t("startupWizard.onboarding.modelProgressLabel")}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-control bg-element">
                <div
                  className="h-full rounded-control bg-accent transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-subtle">
              {t("startupWizard.onboarding.modelProgressHint")}
            </p>
          </div>
        )}

        {phase === "error" && (
          <p className="text-center text-xs text-danger-fg">
            {t("startupWizard.onboarding.modelErrorBody")}
          </p>
        )}

        {isReady && (
          <div className="space-y-1 text-center">
            <p className="text-sm font-semibold">
              {t("startupWizard.onboarding.modelDoneTitle")}
            </p>
            <p className="text-xs text-muted">
              {t("startupWizard.onboarding.modelDoneBody")}
            </p>
          </div>
        )}

        {(phase === "downloading" || isReady) && (
          <button
            type="button"
            onClick={onContinue}
            className="w-full rounded-control bg-accent px-6 py-2.5 text-sm text-white hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.modelContinue")}
          </button>
        )}

        {phase === "error" && (
          <button
            type="button"
            onClick={startDownload}
            className="w-full rounded-control bg-accent px-6 py-2.5 text-sm text-white hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.modelRetry")}
          </button>
        )}

        {/* 모든 상태에서 건너뛰기를 제공한다 — 다운로드 여부와 무관하게 진행 가능. */}
        <button
          type="button"
          onClick={onContinue}
          className="w-full rounded-control bg-fg/10 px-6 py-2.5 text-sm text-fg/80 transition-colors hover:bg-fg/15"
        >
          {t("startupWizard.onboarding.modelLater")}
        </button>
      </div>
    </div>
  );
}
