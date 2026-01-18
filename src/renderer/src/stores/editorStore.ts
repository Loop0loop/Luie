import { create } from 'zustand';

export type FontFamily = 'serif' | 'sans' | 'mono';
export type EditorTheme = 'light' | 'dark' | 'sepia';

interface EditorSettings {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  theme: EditorTheme;
}

interface EditorStore extends EditorSettings {
  updateSettings: (settings: Partial<EditorSettings>) => void;
  setFontSize: (size: number) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.8,
  maxWidth: 800,
  theme: 'light',
};

export const useEditorStore = create<EditorStore>((set) => ({
  ...DEFAULT_SETTINGS,
  updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
  setFontSize: (size: number) => set({ fontSize: size }),
  resetSettings: () => set(DEFAULT_SETTINGS),
}));
