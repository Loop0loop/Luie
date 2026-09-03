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

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-6">
        {/* Apple HIG Liquid Glass: 반투명 패널과 깊이 있는 블러, 넉넉한 여백의 플로팅 독 */}
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3.5 rounded-editor-shell border border-border/70 bg-panel/75 px-5 py-3 shadow-panel backdrop-blur-2xl">
          <span className="shrink-0 pr-1 text-sm font-semibold text-fg">
            {t("startupWizard.onboarding.themeTitle")}
          </span>
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

          <span aria-hidden className="mx-0.5 h-8 w-px self-center bg-border/80" />

          {/* 색온도 세그먼트 컨트롤: 자연스러운 시각 어포던스로 탭하고 싶게 만드는 컨트롤 */}
          <div className="flex shrink-0 flex-col gap-1 self-center">
            <span className="text-[11px] font-medium text-muted">
              {t("startupWizard.onboarding.tempTitle")}
            </span>
            <div className="flex items-center gap-1 rounded-control border border-border/70 bg-element/60 p-1 shadow-inner">
              {TEMP_OPTIONS.map(([id, labelKey]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={themeTemp === id}
                  onClick={() => onThemeTempChange(id)}
                  className={`flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-xs transition-all duration-150 ${
                    themeTemp === id
                      ? "bg-surface font-semibold text-fg shadow-xs border border-border/40"
                      : "font-normal text-muted hover:bg-surface/40 hover:text-fg"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 transition-opacity"
                    style={{
                      borderRadius: "50%",
                      backgroundColor:
                        id === "cool"
                          ? "#60a5fa"
                          : id === "warm"
                            ? "#f59e0b"
                            : "#9ca3af",
                      opacity: themeTemp === id ? 1 : 0.6,
                    }}
                  />
                  {t(`startupWizard.onboarding.${labelKey}`)}
                </button>
              ))}
            </div>
          </div>

          <span aria-hidden className="mx-0.5 h-8 w-px self-center bg-border/80" />

          <div className="flex items-center gap-2 self-center pt-3.5">
            <button
              type="button"
              onClick={onPrevious}
              className="rounded-control border border-border/70 bg-surface/70 px-4 py-1.5 text-sm font-medium text-fg shadow-xs transition-all hover:bg-surface hover:border-border active:scale-[0.98]"
            >
              {t("startupWizard.onboarding.previous")}
            </button>
            <button
              type="button"
              onClick={onNext}
              className="rounded-control bg-accent px-5 py-1.5 text-sm font-medium text-on-accent shadow-control transition-all hover:bg-accent-bg-hover active:scale-[0.98]"
            >
              {t("startupWizard.onboarding.next")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
