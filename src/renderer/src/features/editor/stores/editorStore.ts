import { create } from "zustand";
import type {
  EditorSettings,
  EditorTheme,
  FontFamily,
  FontPreset,
  ThemeContrast,
  ThemeTemp,
  ThemeAccent,
  EditorUiMode,
} from "@shared/types";
export type { EditorSettings, EditorTheme, FontFamily, FontPreset };
import {
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_LETTER_SPACING,
  DEFAULT_EDITOR_WORD_SPACING,
  DEFAULT_EDITOR_PARAGRAPH_SPACING,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
} from "@shared/constants/app/configs";
import { editorSettingsSchema } from "@shared/schemas";
import { api } from "@shared/api";

interface EditorStore extends EditorSettings {
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<EditorSettings>) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setTheme: (theme: EditorTheme) => Promise<void>;
  setFontFamily: (fontFamily: FontFamily) => Promise<void>;
  setUiMode: (mode: EditorUiMode) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: "system-ui",
  fontPreset: undefined,
  customFontFamily: undefined,
  fontSize: DEFAULT_EDITOR_FONT_SIZE,
  lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
  letterSpacing: DEFAULT_EDITOR_LETTER_SPACING,
  wordSpacing: DEFAULT_EDITOR_WORD_SPACING,
  paragraphSpacing: DEFAULT_EDITOR_PARAGRAPH_SPACING,
  maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
  spellcheckEnabled: true,
  theme: DEFAULT_EDITOR_THEME,
  themeContrast: DEFAULT_EDITOR_THEME_CONTRAST as ThemeContrast,
  themeTemp: DEFAULT_EDITOR_THEME_TEMP as ThemeTemp,
  themeAccent: DEFAULT_EDITOR_THEME_ACCENT as ThemeAccent,
  uiMode: "default",
  enableAnimations: true,
  entityColors: {
    character: "#2563eb", // blue-600
    event: "#d97706", // amber-600
    faction: "#059669", // emerald-600
    term: "#7c3aed", // violet-600
  },
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  ...DEFAULT_SETTINGS,

  loadSettings: async () => {
    const response = await api.settings.getEditor();
    if (response.success && response.data) {
      const parsed = editorSettingsSchema.safeParse(response.data);
      if (parsed.success) {
        set(parsed.data);
      } else {
        await api.logger.warn("Invalid editor settings payload", parsed.error);
      }
    }
  },

  updateSettings: async (newSettings: Partial<EditorSettings>) => {
    const current = get();
    const updated: EditorSettings = {
      fontFamily: current.fontFamily,
      fontPreset: current.fontPreset,
      customFontFamily: current.customFontFamily,
      fontSize: current.fontSize,
      lineHeight: current.lineHeight,
      maxWidth: current.maxWidth,
      spellcheckEnabled: current.spellcheckEnabled ?? true,
      letterSpacing: current.letterSpacing ?? DEFAULT_EDITOR_LETTER_SPACING,
      wordSpacing: current.wordSpacing ?? DEFAULT_EDITOR_WORD_SPACING,
      paragraphSpacing: current.paragraphSpacing ?? DEFAULT_EDITOR_PARAGRAPH_SPACING,
      theme: current.theme,
      themeContrast: current.themeContrast ?? DEFAULT_EDITOR_THEME_CONTRAST,
      themeTemp: current.themeTemp ?? DEFAULT_EDITOR_THEME_TEMP,
      themeAccent: current.themeAccent ?? DEFAULT_EDITOR_THEME_ACCENT,
      uiMode: current.uiMode ?? "default",
      enableAnimations: current.enableAnimations ?? true,
      entityColors: current.entityColors ?? DEFAULT_SETTINGS.entityColors,
      ...newSettings,
    };
    const response = await api.settings.setEditor(updated);
    if (response.success && response.data) {
      const parsed = editorSettingsSchema.safeParse(response.data);
      if (parsed.success) {
        set(parsed.data);
      } else {
        await api.logger.warn("Invalid editor settings payload", parsed.error);
      }
    }
  },

  setFontSize: async (size: number) => {
    await get().updateSettings({ fontSize: size });
  },

  setTheme: async (theme: EditorTheme) => {
    await get().updateSettings({ theme });
  },

  setFontFamily: async (fontFamily: FontFamily) => {
    await get().updateSettings({ fontFamily });
  },

  setUiMode: async (mode: EditorUiMode) => {
    await get().updateSettings({ uiMode: mode });
  },

  resetSettings: async () => {
    const response = await api.settings.reset();
    if (response.success && response.data) {
      const editorSettings = response.data.editor;
      set(editorSettings);
    }
  },
}));
