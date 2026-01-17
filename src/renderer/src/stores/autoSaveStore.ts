import { create } from "zustand";

interface AutoSaveStore {
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  triggerSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ) => Promise<void>;
}

export const useAutoSaveStore = create<AutoSaveStore>((set, get) => ({
  saveStatus: "idle",

  setSaveStatus: (status) => set({ saveStatus: status }),

  triggerSave: async (chapterId, content, projectId) => {
    set({ saveStatus: "saving" });
    try {
      await window.api.autoSave(chapterId, content, projectId);
      set({ saveStatus: "saved" });

      setTimeout(() => {
        if (get().saveStatus === "saved") {
          set({ saveStatus: "idle" });
        }
      }, 2000);
    } catch (error) {
      console.error("Auto save failed:", error);
      set({ saveStatus: "error" });
    }
  },
}));
