import type { ThemeChoice } from "../types/wizard";

export interface ThemeCardColors {
  app: string;
  sidebar: string;
  bar: string;
  hairline: string;
}

// 테마 카드는 macOS 설정 앱 "모양" 패널과 같은 패턴 — 각 테마의 확정 표면색으로
// 미니 창(사이드바+본문)을 그리고 라벨은 카드 아래에 둔다.
// global.tokens.css의 에뮬레이션 토큰 변수를 참조한다.
export const THEME_CARDS: Record<ThemeChoice, ThemeCardColors> = {
  light: {
    app: "var(--wizard-card-light-app)",
    sidebar: "var(--wizard-card-light-sidebar)",
    bar: "var(--wizard-card-light-bar)",
    hairline: "var(--wizard-card-light-hairline)",
  },
  dark: {
    app: "var(--wizard-card-dark-app)",
    sidebar: "var(--wizard-card-dark-sidebar)",
    bar: "var(--wizard-card-dark-bar)",
    hairline: "var(--wizard-card-dark-hairline)",
  },
  sepia: {
    app: "var(--wizard-card-sepia-app)",
    sidebar: "var(--wizard-card-sepia-sidebar)",
    bar: "var(--wizard-card-sepia-bar)",
    hairline: "var(--wizard-card-sepia-hairline)",
  },
};
