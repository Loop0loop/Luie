import { create } from "zustand";

interface EditorStatsStore {
    wordCount: number;
    charCount: number;
    saveStatus: "idle" | "saving" | "saved" | "error";

    setStats: (stats: { wordCount: number; charCount: number }) => void;
    setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
}

export const useEditorStatsStore = create<EditorStatsStore>((set) => ({
    wordCount: 0,
    charCount: 0,
    saveStatus: "idle",

    setStats: (stats) => set(stats),
    setSaveStatus: (status) => set({ saveStatus: status }),
}));
