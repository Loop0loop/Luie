import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import { useTranslation } from "react-i18next";
import { api } from "@shared/api";
import type { EditorSettings } from "@shared/types";

type WizardStep = "intro" | "theme" | "layout" | "finalizing" | "error";
type ThemeChoice = EditorSettings["theme"];
type TempChoice = EditorSettings["themeTemp"];
type LayoutChoice = EditorSettings["uiMode"];

// 테마 카드 프리뷰는 "선택하면 바뀔 테마"를 항상 그대로 보여줘야 하므로 활성 token이
// 아니라 각 테마의 확정 표면색을 고정한다(global.tokens.css의 --bg-app/-sidebar/-panel).
const THEME_PREVIEWS: Record<
  ThemeChoice,
  { app: string; sidebar: string; panel: string }
> = {
  light: { app: "#f9f9f7", sidebar: "#eeeeec", panel: "#ffffff" },
  sepia: { app: "#fbf2e2", sidebar: "#f4e7d0", panel: "#fdf7ed" },
  dark: { app: "#1a1a1c", sidebar: "#212123", panel: "#28282b" },
};

// NOTE: macOS hiddenInset 타이틀바는 앱이 drag region을 그려줘야 창을 끌 수 있다.
// 헤더 밴드가 그 역할을 하고, 트래픽 라이트(16,16)에 가리지 않도록 좌측 여백을 둔다.
const dragRegionStyle = { WebkitAppRegion: "drag" } as CSSProperties;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const paneClass =
  "rounded-[3px] border border-border bg-surface";
const barClass = "rounded-[2px] bg-element";

const LayoutWireframe = ({ id }: { id: LayoutChoice }) => {
  if (id === "default") {
    return (
      <div
        aria-hidden
        className="flex h-14 w-full gap-1 rounded-control border border-border bg-app p-1.5"
      >
        <div className={`${paneClass} w-1/4`} />
        <div className={`${paneClass} flex-1 space-y-1 p-1`}>
          <div className={`${barClass} h-1.5 w-3/4`} />
          <div className={`${barClass} h-1.5 w-1/2`} />
          <div className={`${barClass} h-1.5 w-2/3`} />
        </div>
        <div className={`${paneClass} w-1/5`} />
      </div>
    );
  }
  if (id === "docs") {
    return (
      <div
        aria-hidden
        className="flex h-14 w-full flex-col gap-1 rounded-control border border-border bg-app p-1.5"
      >
        <div className={`${paneClass} h-2.5 w-full`} />
        <div className="flex flex-1 justify-center gap-1 pt-0.5">
          <div className={`${paneClass} h-full w-2/3 space-y-1 p-1`}>
            <div className={`${barClass} h-1.5 w-full`} />
            <div className={`${barClass} h-1.5 w-5/6`} />
            <div className={`${barClass} h-1.5 w-4/6`} />
          </div>
        </div>
      </div>
    );
  }
  if (id === "editor") {
    return (
      <div
        aria-hidden
        className="flex h-14 w-full justify-center rounded-control border border-border bg-app p-1.5"
      >
        <div className={`${paneClass} h-full w-1/2 space-y-1 p-1`}>
          <div className={`${barClass} h-1.5 w-full`} />
          <div className={`${barClass} h-1.5 w-5/6`} />
          <div className={`${barClass} h-1.5 w-2/3`} />
        </div>
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="flex h-14 w-full gap-1 rounded-control border border-border bg-app p-1.5"
    >
      <div className={`${paneClass} w-1/5`} />
      <div className={`${paneClass} flex-1 space-y-1 p-1`}>
        <div className={`${barClass} h-1.5 w-full`} />
        <div className={`${barClass} h-1.5 w-3/4`} />
        <div className={`${barClass} h-1.5 w-5/6`} />
      </div>
      <div className={`${paneClass} w-1/5`} />
    </div>
  );
};

const ThemePreview = ({
  preview,
}: {
  preview: { app: string; sidebar: string; panel: string };
}) => (
  <span
    aria-hidden
    className="flex h-16 w-full overflow-hidden rounded-control border border-border"
  >
    <span className="w-1/4" style={{ background: preview.sidebar }} />
    <span
      className="flex flex-1 flex-col gap-1 p-1.5"
      style={{ background: preview.app }}
    >
      <span
        className="block h-2 rounded-sm border border-black/10"
        style={{ background: preview.panel }}
      />
      <span
        className="block h-1.5 rounded-sm border border-black/5 opacity-80"
        style={{ background: preview.panel }}
      />
    </span>
  </span>
);

export default function StartupWizard() {
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>("intro");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [editorSettings, setEditorSettings] = useState<EditorSettings | null>(
    null,
  );
  const [theme, setTheme] = useState<ThemeChoice>("light");
  const [themeTemp, setThemeTemp] = useState<TempChoice>("neutral");
  const [uiMode, setUiMode] = useState<LayoutChoice>("default");

  useEffect(() => {
    if (step !== "theme") return;
    void (async () => {
      const response = await api.settings.getEditor();
      if (response.success && response.data) {
        setEditorSettings(response.data);
        setTheme(response.data.theme);
        setThemeTemp(response.data.themeTemp);
        setUiMode(response.data.uiMode);
      }
    })();
  }, [step]);

  // NOTE: 위저드는 별도 BrowserWindow라 documentElement에 theme 속성을 걸어도
  // 메인 앱에는 영향이 없다. intro(A)는 테마 확정 전이라 고정 다크
  // bootstrap(--color-wizard-bootstrap) 위에서 읽히도록 dark를 깐다.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const isIntro = step === "intro";
    root.setAttribute("data-theme", isIntro ? "dark" : theme);
    root.setAttribute("data-temp", isIntro ? "neutral" : themeTemp);
    if (isIntro || !editorSettings) return;
    if (editorSettings.themeAccent) {
      if (editorSettings.themeAccent.startsWith("#")) {
        root.setAttribute("data-accent", "custom");
        root.style.setProperty("--accent-bg", editorSettings.themeAccent);
      } else {
        root.setAttribute("data-accent", editorSettings.themeAccent);
        root.style.removeProperty("--accent-bg");
      }
    }
    if (editorSettings.themeContrast) {
      root.setAttribute("data-contrast", editorSettings.themeContrast);
    }
  }, [step, theme, themeTemp, editorSettings]);

  const handleStart = useCallback(() => {
    // B 단계부터는 폭이 더 큰 가로형(폭 > 높이, 과하지 않게)으로 확장한다.
    void api.window.setStartupWizardSize(760, 600);
    setStep("theme");
  }, []);

  const persistEditorSettings = useCallback(async () => {
    if (!editorSettings) return;
    await api.settings.setEditor({
      ...editorSettings,
      theme,
      themeTemp,
      uiMode,
    });
  }, [editorSettings, theme, themeTemp, uiMode]);

  const finalize = useCallback(async () => {
    setStep("finalizing");
    setErrorMessage(null);
    try {
      await persistEditorSettings();
      const readinessResponse = await api.startup.getReadiness();
      if (!readinessResponse.success || !readinessResponse.data) {
        throw new Error(
          readinessResponse.error?.message ??
            "Failed to evaluate startup readiness",
        );
      }
      if (readinessResponse.data.mustRunWizard) {
        const completeResponse = await api.startup.completeWizard();
        if (!completeResponse.success || !completeResponse.data) {
          throw new Error(
            completeResponse.error?.message ??
              "Failed to complete startup configuration",
          );
        }
        if (completeResponse.data.mustRunWizard) {
          const unresolved = completeResponse.data.reasons.join(", ");
          throw new Error(`STARTUP_PENDING_CHECKS:${unresolved || "unknown"}`);
        }
      }
    } catch (error) {
      setStep("error");
      setErrorMessage(getErrorMessage(error));
    }
  }, [persistEditorSettings]);

  useEffect(() => {
    if (attempt === 0) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void finalize();
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, finalize]);

  return (
    <div
      className={`flex min-h-screen flex-col text-fg ${
        step === "intro" ? "bg-wizard-bootstrap" : "bg-app"
      }`}
    >
      <header
        className="h-12 shrink-0 select-none pl-20"
        style={dragRegionStyle}
      />

      <main className="flex min-h-0 flex-1 flex-col px-10 pb-10">
        {step === "intro" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-9 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("startupWizard.onboarding.startTitle")}
            </h1>
            <button
              type="button"
              onClick={handleStart}
              className="rounded-control bg-accent px-10 py-2.5 text-sm text-white hover:bg-accent-bg-hover"
            >
              {t("startupWizard.onboarding.startCta")}
            </button>
          </div>
        )}

        {step === "theme" && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">
                {t("startupWizard.onboarding.themeTitle")}
              </h1>
              <p className="text-xs text-muted">
                {t("startupWizard.onboarding.themeBody")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["light", "themeLight"],
                  ["sepia", "themeSepia"],
                  ["dark", "themeDark"],
                ] as const
              ).map(([id, labelKey]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={theme === id}
                  onClick={() => setTheme(id)}
                  className={`flex flex-col items-center gap-2 rounded-panel border p-3 transition-colors ${
                    theme === id
                      ? "border-accent ring-1 ring-accent"
                      : "border-border hover:border-border-active"
                  }`}
                >
                  <ThemePreview preview={THEME_PREVIEWS[id]} />
                  <span className="text-xs font-medium">
                    {t(`startupWizard.onboarding.${labelKey}`)}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-fg-secondary">
                {t("startupWizard.onboarding.tempTitle")}
              </p>
              <div className="grid grid-cols-3 gap-1 rounded-control border border-border bg-surface p-1">
                {(
                  [
                    ["cool", "tempCool"],
                    ["neutral", "tempNeutral"],
                    ["warm", "tempWarm"],
                  ] as const
                ).map(([id, labelKey]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={themeTemp === id}
                    onClick={() => setThemeTemp(id)}
                    className={`rounded-control px-3 py-1.5 text-xs transition-colors ${
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

            <div className="mt-auto flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="rounded-control border border-border px-5 py-2 text-sm text-muted hover:bg-surface-hover"
              >
                {t("startupWizard.onboarding.previous")}
              </button>
              <button
                type="button"
                onClick={() => {
                  void persistEditorSettings();
                  setStep("layout");
                }}
                className="flex-1 rounded-control bg-accent px-4 py-2 text-sm text-white hover:bg-accent-bg-hover"
              >
                {t("startupWizard.onboarding.next")}
              </button>
            </div>
          </div>
        )}

        {step === "layout" && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">
                {t("startupWizard.onboarding.layoutTitle")}
              </h1>
              <p className="text-xs text-muted">
                {t("startupWizard.onboarding.layoutBody")}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {(
                [
                  ["default", "layoutDefault"],
                  ["docs", "layoutDocs"],
                  ["editor", "layoutEditor"],
                  ["scrivener", "layoutScrivener"],
                ] as const
              ).map(([id, labelKey]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={uiMode === id}
                  onClick={() => setUiMode(id)}
                  className={`flex flex-col items-center gap-2 rounded-panel border p-3 transition-colors ${
                    uiMode === id
                      ? "border-accent ring-1 ring-accent"
                      : "border-border hover:border-border-active"
                  }`}
                >
                  <LayoutWireframe id={id} />
                  <span className="text-xs font-medium">
                    {t(`startupWizard.onboarding.${labelKey}`)}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-auto flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep("theme")}
                className="rounded-control border border-border px-5 py-2 text-sm text-muted hover:bg-surface-hover"
              >
                {t("startupWizard.onboarding.previous")}
              </button>
              <button
                type="button"
                onClick={() => void finalize()}
                className="flex-1 rounded-control bg-accent px-4 py-2 text-sm text-white hover:bg-accent-bg-hover"
              >
                {t("startupWizard.onboarding.finish")}
              </button>
            </div>
          </div>
        )}

        {(step === "finalizing" || step === "error") && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border-4 border-border" />
              <div
                className={`absolute inset-0 rounded-full border-4 border-transparent border-t-accent ${
                  step === "finalizing" ? "animate-spin" : ""
                }`}
              />
            </div>
            <p className="text-sm text-muted">
              {t("startupWizard.onboarding.finishing")}
            </p>

            {step === "error" && (
              <div className="w-full space-y-3">
                <p className="break-all text-xs text-danger-fg">
                  {errorMessage ?? t("startupWizard.status.failed")}
                </p>
                <button
                  type="button"
                  onClick={() => setAttempt((prev) => prev + 1)}
                  className="w-full rounded-control bg-accent px-4 py-2 text-sm text-white hover:bg-accent-bg-hover"
                >
                  {t("startupWizard.actions.retry")}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
