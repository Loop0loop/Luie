import { useLayoutEffect } from "react";
import type { EditorSettings } from "@shared/types";
import type { TempChoice, ThemeChoice, WizardStep } from "../types/wizard";

// NOTE: 위저드는 별도 BrowserWindow라 documentElement에 theme 속성을 걸어도
// 메인 앱에는 영향이 없다. intro(A)·model(A')은 테마 확정 전이라 고정 다크
// bootstrap(--color-wizard-bootstrap) 위에서 읽히도록 dark를 깐다.
// data-animations는 global.behaviors.css의 모션 억제(OS reduced-motion 포함)와
// 이어지는 스위치라서, 단계 전환·창 확장 애니메이션도 이 경로를 따라간다.
export function useWizardThemeEffect(
  step: WizardStep,
  theme: ThemeChoice,
  themeTemp: TempChoice,
  editorSettings: EditorSettings | null,
): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    // intro(A)와 model(A')은 테마 확정 전 단계라 고정 다크 bootstrap을 쓴다.
    const isBootstrapStage = step === "intro" || step === "model";
    root.setAttribute("data-theme", isBootstrapStage ? "dark" : theme);
    root.setAttribute("data-temp", isBootstrapStage ? "neutral" : themeTemp);
    root.setAttribute(
      "data-animations",
      (editorSettings?.enableAnimations ?? true) ? "on" : "off",
    );
    if (isBootstrapStage || !editorSettings) return;
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
}
