import { create } from "zustand";
import { AUTO_SAVE_STATUS_RESET_MS } from "../../../shared/constants";

interface AutoSaveStore {
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  triggerSave: (
    chapterId: string,
    content: string,
    projectId: string,
  ) => Promise<void>;
}

export const useAutoSaveStore = create<AutoSaveStore>((set, get) => {
  const lastSavedContentByChapter = new Map<string, string>();
  const lastRequestedContentByChapter = new Map<string, string>();

  return {
    saveStatus: "idle",

    setSaveStatus: (status) => set({ saveStatus: status }),

    triggerSave: async (chapterId, content, projectId) => {
      const lastSaved = lastSavedContentByChapter.get(chapterId);
      const lastRequested = lastRequestedContentByChapter.get(chapterId);

      if (lastSaved === content) {
        if (get().saveStatus !== "idle") {
          set({ saveStatus: "idle" });
        }
        return;
      }

      if (lastRequested === content) {
        return;
      }

      lastRequestedContentByChapter.set(chapterId, content);
      set({ saveStatus: "saving" });

      try {
        await window.api.autoSave(chapterId, content, projectId);
        lastSavedContentByChapter.set(chapterId, content);
        lastRequestedContentByChapter.delete(chapterId);
        set({ saveStatus: "saved" });

        setTimeout(() => {
          if (get().saveStatus === "saved") {
            set({ saveStatus: "idle" });
          }
        }, AUTO_SAVE_STATUS_RESET_MS);
      } catch (error) {
        lastRequestedContentByChapter.delete(chapterId);
        window.api.logger.error("Auto save failed", error);
        set({ saveStatus: "error" });
      }
    },
  };
});
