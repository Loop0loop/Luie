import type { EditorSettings } from "@shared/types";
import {
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
} from "@shared/constants/app/configs";

export type ThemeSeed = Pick<
  EditorSettings,
  | "theme"
  | "themeContrast"
  | "themeTemp"
  | "themeAccent"
  | "enableAnimations"
>;

const THEME_SEED_STORAGE_KEY = "luie:theme-seed";

const THEME_VALUES = new Set(["light", "dark", "sepia"]);
const CONTRAST_VALUES = new Set(["soft", "high"]);
const TEMP_VALUES = new Set(["cool", "neutral", "warm"]);

/**
 * 느슨한 값(스토어·localStorage 직렬화 결과)을 유효한 시드로 못박는다.
 * 필드별로 기본값으로 대체하므로 일부 필드가 깨져도 나머지는 살린다.
 */
export const toThemeSeed = (input: {
  theme?: unknown;
  themeContrast?: unknown;
  themeTemp?: unknown;
  themeAccent?: unknown;
  enableAnimations?: unknown;
}): ThemeSeed => ({
  theme: THEME_VALUES.has(input.theme as string)
    ? (input.theme as ThemeSeed["theme"])
    : DEFAULT_EDITOR_THEME,
  themeContrast: CONTRAST_VALUES.has(input.themeContrast as string)
    ? (input.themeContrast as ThemeSeed["themeContrast"])
    : DEFAULT_EDITOR_THEME_CONTRAST,
  themeTemp: TEMP_VALUES.has(input.themeTemp as string)
    ? (input.themeTemp as ThemeSeed["themeTemp"])
    : DEFAULT_EDITOR_THEME_TEMP,
  themeAccent:
    typeof input.themeAccent === "string" && input.themeAccent.length > 0
      ? input.themeAccent
      : DEFAULT_EDITOR_THEME_ACCENT,
  enableAnimations:
    typeof input.enableAnimations === "boolean" ? input.enableAnimations : true,
});

/**
 * 마지막으로 확정된 테마 시드를 렌더러 시작 직후 동기적으로 복원하기 위한 캐시다.
 * 설정 IPC가 돌아오기 전 첫 페인트는 이 값으로 칠해지므로, 캐시가 없으면(최초 실행)
 * 다크 사용자도 기본 light로 한 번 플래시된다. 저장은 설정이 확정된 지점
 * (setupRenderer·useThemeAttributes)에서만 한다 — IPC 실패 시 기본값 시드로
 * 캐시를 덮어쓰지 않도록 applyThemeSeed 안에 두지 않는다.
 */
export const loadCachedThemeSeed = (): ThemeSeed | null => {
  try {
    const raw = localStorage.getItem(THEME_SEED_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return toThemeSeed(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
};

export const saveThemeSeed = (seed: ThemeSeed): void => {
  try {
    localStorage.setItem(THEME_SEED_STORAGE_KEY, JSON.stringify(seed));
  } catch {
    // storage disabled
  }
};
