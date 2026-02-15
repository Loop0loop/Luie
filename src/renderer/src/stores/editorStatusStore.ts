import { create } from "zustand";

interface EditorStatusState {
  wordCount: number;
  charCount: number;
  saveStatus: "idle" | "saving" | "saved" | "error";
  setStats: (stats: { wordCount: number; charCount: number }) => void;
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
}

export const useEditorStatusStore = create<EditorStatusState>((set) => ({
  wordCount: 0,
  charCount: 0,
  saveStatus: "idle",
  setStats: (stats) => set(stats),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
