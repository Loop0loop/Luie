import { create } from "zustand";
import type {
  EditorSettings,
  EditorTheme,
  FontFamily,
} from "../../../shared/types";
export type { EditorSettings, EditorTheme, FontFamily, FontPreset } from "../../../shared/types";
import {
  DEFAULT_EDITOR_FONT_FAMILY,
  DEFAULT_EDITOR_FONT_PRESET,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_EDITOR_LINE_HEIGHT,
  DEFAULT_EDITOR_MAX_WIDTH,
  DEFAULT_EDITOR_THEME,
} from "../../../shared/constants";
import { editorSettingsSchema } from "../../../shared/schemas";
import { api } from "../services/api";

interface EditorStore extends EditorSettings {
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<EditorSettings>) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setTheme: (theme: EditorTheme) => Promise<void>;
  setFontFamily: (fontFamily: FontFamily) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: DEFAULT_EDITOR_FONT_FAMILY,
  fontPreset: DEFAULT_EDITOR_FONT_PRESET,
  fontSize: DEFAULT_EDITOR_FONT_SIZE,
  lineHeight: DEFAULT_EDITOR_LINE_HEIGHT,
  maxWidth: DEFAULT_EDITOR_MAX_WIDTH,
  theme: DEFAULT_EDITOR_THEME,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
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
      fontSize: current.fontSize,
      lineHeight: current.lineHeight,
      maxWidth: current.maxWidth,
      theme: current.theme,
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

  resetSettings: async () => {
    const response = await api.settings.reset();
    if (response.success && response.data) {
      const editorSettings = response.data.editor;
      set(editorSettings);
    }
  },
}));
