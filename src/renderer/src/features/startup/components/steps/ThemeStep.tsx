import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { layoutFallback } from "@renderer/features/workspace/components/layout/rootShell";
import { THEME_CARDS } from "../../constants/themeCards";
import type { TempChoice, ThemeChoice } from "../../types/wizard";
import { PreviewBoundary } from "../PreviewBoundary";
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

      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-6">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-end gap-2 rounded-panel border border-border/60 bg-panel/60 p-2 shadow-panel backdrop-blur-2xl">
          <span className="mb-1.5 self-center pr-1 text-sm font-semibold text-fg">
            {t("startupWizard.onboarding.themeTitle")}
          </span>
          <div className="flex gap-2" role="radiogroup">
            {THEME_OPTIONS.map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={theme === id}
                onClick={() => onThemeChange(id)}
                className="flex w-[126px] flex-col items-center gap-1.5 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span
                  style={{ backgroundColor: THEME_CARDS[id].app }}
                  className={`relative block h-[76px] w-full overflow-hidden rounded-xl transition-shadow ${
                    theme === id
                      ? "ring-2 ring-accent"
                      : "ring-border ring-1 ring-inset hover:ring-border-active"
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
                  className={`text-[11px] ${
                    theme === id
                      ? "font-semibold text-fg"
                      : "font-medium text-muted"
                  }`}
                >
                  {t(`startupWizard.onboarding.${labelKey}`)}
                </span>
              </button>
            ))}
          </div>

          <span aria-hidden className="mx-1 mb-1 h-9 w-px bg-border/70" />

          <div className="flex shrink-0 flex-col gap-1.5 pb-0.5">
            <span className="text-[10px] font-medium text-muted">
              {t("startupWizard.onboarding.tempTitle")}
            </span>
            <div className="grid w-[168px] grid-cols-3 gap-1 rounded-control border border-border bg-surface p-1">
              {TEMP_OPTIONS.map(([id, labelKey]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={themeTemp === id}
                  onClick={() => onThemeTempChange(id)}
                  className={`rounded-control px-1.5 py-1 text-[11px] transition-colors ${
                    themeTemp === id
                      ? "bg-element font-medium text-fg"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  {t(`startupWizard.onboarding.${labelKey}`)}
                </button>
              ))}
            </div>
          </div>

          <span aria-hidden className="mx-1 mb-1 h-9 w-px bg-border/70" />
          <button
            type="button"
            onClick={onPrevious}
            className="mb-0.5 rounded-control px-4 py-1.5 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-fg"
          >
            {t("startupWizard.onboarding.previous")}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="mb-0.5 rounded-control bg-accent px-5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-bg-hover"
          >
            {t("startupWizard.onboarding.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
