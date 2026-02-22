import { create } from "zustand";
import type {
  EditorSettings,
  EditorTheme,
  FontFamily,
  FontPreset,
  ThemeTemperature,
  ThemeContrast,
  ThemeAccent,
  ThemeTexture,
  EditorUiMode,
} from "@shared/types";
export type { EditorSettings, EditorTheme, FontFamily, FontPreset };
import {
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_EDITOR_FONT_PRESET,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_THEME,
  DEFAULT_EDITOR_THEME_ACCENT,
  DEFAULT_EDITOR_THEME_CONTRAST,
  DEFAULT_EDITOR_THEME_TEMP,
  DEFAULT_EDITOR_THEME_TEXTURE,
} from "@shared/constants/configs";
import { editorSettingsSchema } from "@shared/schemas";
import { api } from "@shared/api";

interface EditorStore extends EditorSettings {
  wordCount: number;
  charCount: number;
  saveStatus: "idle" | "saving" | "saved" | "error";

  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<EditorSettings>) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setTheme: (theme: EditorTheme) => Promise<void>;
  setFontFamily: (fontFamily: FontFamily) => Promise<void>;
  setUiMode: (mode: EditorUiMode) => Promise<void>;
  resetSettings: () => Promise<void>;

  setStats: (stats: { wordCount: number; charCount: number }) => void;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: DEFAULT_EDITOR_FONT_FAMILY,
  fontPreset: DEFAULT_EDITOR_FONT_PRESET,
  fontSize: DEFAULT_EDITOR_FONT_SIZE,
  lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
  maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
  theme: DEFAULT_EDITOR_THEME,
  themeTemp: DEFAULT_EDITOR_THEME_TEMP as ThemeTemperature,
  themeContrast: DEFAULT_EDITOR_THEME_CONTRAST as ThemeContrast,
  themeAccent: DEFAULT_EDITOR_THEME_ACCENT as ThemeAccent,
  themeTexture: DEFAULT_EDITOR_THEME_TEXTURE as ThemeTexture,
  uiMode: "default",
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  wordCount: 0,
  charCount: 0,
  saveStatus: "idle",

  setStats: (stats) => set(stats),
  setSaveStatus: (status) => set({ saveStatus: status }),

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
      fontSize: current.fontSize,
      lineHeight: current.lineHeight,
      maxWidth: current.maxWidth,
      theme: current.theme,
      themeTemp: current.themeTemp ?? DEFAULT_EDITOR_THEME_TEMP,
      themeContrast: current.themeContrast ?? DEFAULT_EDITOR_THEME_CONTRAST,
      themeAccent: current.themeAccent ?? DEFAULT_EDITOR_THEME_ACCENT,
      themeTexture: current.themeTexture ?? DEFAULT_EDITOR_THEME_TEXTURE,
      uiMode: current.uiMode ?? "default",
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
