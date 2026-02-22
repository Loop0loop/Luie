import type { EditorSettings } from "@shared/types";
import {
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
  DEFAULT_EDITOR_THEME_TEXTURE,
} from "@shared/constants/configs";
import { editorSettingsSchema } from "@shared/schemas/index.js";
import { api } from "@shared/api";

type ThemeSeed = Pick<
  EditorSettings,
  "theme" | "themeTemp" | "themeContrast" | "themeAccent" | "themeTexture"
>;

const DEFAULT_THEME_SEED: ThemeSeed = {
  theme: DEFAULT_EDITOR_THEME,
  themeTemp: DEFAULT_EDITOR_THEME_TEMP,
  themeContrast: DEFAULT_EDITOR_THEME_CONTRAST,
  themeAccent: DEFAULT_EDITOR_THEME_ACCENT,
  themeTexture: DEFAULT_EDITOR_THEME_TEXTURE,
};

const applyThemeSeed = (theme: ThemeSeed): void => {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme.theme);
  root.setAttribute("data-temp", theme.themeTemp);
  root.setAttribute("data-contrast", theme.themeContrast);
  root.setAttribute("data-accent", theme.themeAccent);
  root.setAttribute("data-texture", String(theme.themeTexture));
};

const toThemeSeed = (settings: EditorSettings): ThemeSeed => ({
  theme: settings.theme,
  themeTemp: settings.themeTemp,
  themeContrast: settings.themeContrast,
  themeAccent: settings.themeAccent,
  themeTexture: settings.themeTexture,
});

export const setupRenderer = async (): Promise<void> => {
  applyThemeSeed(DEFAULT_THEME_SEED);

  try {
    const response = await api.settings.getEditor();
    if (!response.success || !response.data) {
      return;
    }

    const parsed = editorSettingsSchema.safeParse(response.data);
    if (!parsed.success) {
      return;
    }

    applyThemeSeed(toThemeSeed(parsed.data));
  } catch {
    // Best-effort setup: defaults are already applied.
  }
};
