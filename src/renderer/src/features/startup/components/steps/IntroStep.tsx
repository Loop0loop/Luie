import { useTranslation } from "react-i18next";
import luieIcon from "../../../../assets/luie-icon.png";

interface IntroStepProps {
  onStart: () => void;
  onSkip: () => void;
}

export function IntroStep({ onStart, onSkip }: IntroStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <img
          src={luieIcon}
          alt=""
          className="h-[72px] w-[72px] rounded-2xl shadow-panel"
        />
        <h1 className="pt-2 text-[22px] font-bold tracking-tight">
          {t("startupWizard.onboarding.welcomeTitle")}
        </h1>
        <p className="text-[13px] leading-relaxed text-muted">
          {t("startupWizard.onboarding.welcomeBody")}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-control bg-accent px-6 py-2.5 text-sm text-white hover:bg-accent-bg-hover"
        >
          {t("startupWizard.onboarding.startCta")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="mx-auto block text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {t("startupWizard.onboarding.skip")}
        </button>
      </div>
    </div>
  );
}
