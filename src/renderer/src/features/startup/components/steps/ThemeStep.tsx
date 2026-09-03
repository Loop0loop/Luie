import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { layoutFallback } from "@renderer/features/workspace/components/layout/rootShell";
import { THEME_CARDS } from "../../constants/themeCards";
import type { TempChoice, ThemeChoice } from "../../types/wizard";
import { PreviewBoundary } from "../PreviewBoundary";
import { WizardDockDivider, WizardFloatingDock } from "../WizardFloatingDock";
import { WizardEditor } from "../preview/WizardEditor";

const noop = () => {};

interface ThemeStepProps {
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  themeTemp: TempChoice;
  onThemeTempChange: (temp: TempChoice) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const THEME_OPTIONS = [
  ["light", "themeLight"],
  ["dark", "themeDark"],
  ["sepia", "themeSepia"],
] as const;

const TEMP_OPTIONS = [
  ["cool", "tempCool"],
  ["neutral", "tempNeutral"],
  ["warm", "tempWarm"],
] as const;

export function ThemeStep({
  theme,
  onThemeChange,
  themeTemp,
  onThemeTempChange,
  onPrevious,
  onNext,
}: ThemeStepProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-in fade-in duration-300">
        <PreviewBoundary
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-app text-xs text-muted">
              preview unavailable
            </div>
          }
        >
          <Suspense fallback={layoutFallback}>
            <WizardEditor uiMode="theme" onReady={noop} />
          </Suspense>
        </PreviewBoundary>
      </div>

      <WizardFloatingDock
        title={t("startupWizard.onboarding.themeTitle")}
        onPrevious={onPrevious}
        previousLabel={t("startupWizard.onboarding.previous")}
        onNext={onNext}
        nextLabel={t("startupWizard.onboarding.next")}
      >
        <div className="flex gap-2.5" role="radiogroup">
          {THEME_OPTIONS.map(([id, labelKey]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={theme === id}
              onClick={() => onThemeChange(id)}
              className="group flex w-[124px] flex-col items-center gap-1.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span
                style={{ backgroundColor: THEME_CARDS[id].app }}
                className={`relative block h-[72px] w-full overflow-hidden rounded-panel transition-all duration-150 ${
                  theme === id
                    ? "ring-2 ring-accent shadow-sm scale-[1.02]"
                    : "ring-1 ring-border/80 hover:ring-border-active group-hover:scale-[1.01]"
                }`}
              >
                <span aria-hidden className="absolute inset-0 flex">
                  <span
                    className="flex w-[32%] flex-col gap-1.5 border-r p-1.5"
                    style={{
                      backgroundColor: THEME_CARDS[id].sidebar,
                      borderColor: THEME_CARDS[id].hairline,
                    }}
                  >
                    <span
                      className="block h-1 w-4/5 rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                    <span
                      className="block h-1 w-3/5 rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                    <span
                      className="block h-1 w-2/3 rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                  </span>
                  <span
                    className="flex flex-1 flex-col gap-1.5 p-2"
                    style={{ backgroundColor: THEME_CARDS[id].app }}
                  >
                    <span
                      className="block h-1.5 w-1/2 rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                    <span
                      className="block h-1 w-full rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                    <span
                      className="block h-1 w-full rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                    <span
                      className="block h-1 w-2/3 rounded-full"
                      style={{ backgroundColor: THEME_CARDS[id].bar }}
                    />
                  </span>
                </span>
              </span>
              <span
                className={`text-xs transition-colors ${
                  theme === id
                    ? "font-semibold text-fg"
                    : "font-medium text-muted group-hover:text-fg"
                }`}
              >
                {t(`startupWizard.onboarding.${labelKey}`)}
              </span>
            </button>
          ))}
        </div>

        <WizardDockDivider />

        {/* 색온도 세그먼트 컨트롤: 다크모드에서도 확실한 대비와 명확한 캡슐 하이라이트 */}
        <div className="flex shrink-0 flex-col gap-1 self-center">
          <span className="text-xs font-medium text-fg/80">
            {t("startupWizard.onboarding.tempTitle")}
          </span>
          <div className="flex items-center gap-1 rounded-control border border-border/80 bg-element/80 p-1 shadow-inner">
            {TEMP_OPTIONS.map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                aria-pressed={themeTemp === id}
                onClick={() => onThemeTempChange(id)}
                className={`flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-xs transition-all duration-150 ${
                  themeTemp === id
                    ? "bg-active font-semibold text-fg shadow-xs border border-border-strong/60 scale-[1.02]"
                    : "font-medium text-muted hover:bg-surface-hover/50 hover:text-fg"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 transition-all ${
                    themeTemp === id ? "scale-110 shadow-xs" : "opacity-80"
                  }`}
                  style={{
                    borderRadius: "50%",
                    backgroundColor:
                      id === "cool"
                        ? "#60a5fa"
                        : id === "warm"
                          ? "#fbbf24"
                          : "#e4e4e7",
                  }}
                />
                {t(`startupWizard.onboarding.${labelKey}`)}
              </button>
            ))}
          </div>
        </div>
      </WizardFloatingDock>
    </div>
  );
}
