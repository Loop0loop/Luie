import { create } from "zustand";

export type FontFamily = "serif" | "sans" | "mono";
export type EditorTheme = "light" | "dark" | "sepia";

interface EditorSettings {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  theme: EditorTheme;
}

interface EditorStore extends EditorSettings {
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<EditorSettings>) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  setTheme: (theme: EditorTheme) => Promise<void>;
  setFontFamily: (fontFamily: FontFamily) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: "serif",
  fontSize: 18,
  lineHeight: 1.8,
  maxWidth: 800,
  theme: "light",
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  loadSettings: async () => {
    const response = await window.api.settings.getEditor();
    if (response.success && response.data) {
      set(response.data);
    }
  },

  updateSettings: async (newSettings: Partial<EditorSettings>) => {
    const current = get();
    const updated: EditorSettings = {
      fontFamily: current.fontFamily,
      fontSize: current.fontSize,
      lineHeight: current.lineHeight,
      maxWidth: current.maxWidth,
      theme: current.theme,
      ...newSettings,
    };
    const response = await window.api.settings.setEditor(updated);
    if (response.success && response.data) {
      set(response.data);
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
    const response = await window.api.settings.reset();
    if (response.success && response.data) {
      const editorSettings = response.data.editor;
      set(editorSettings);
    }
  },
}));
