import { create } from "zustand";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "error";

interface UpdaterState {
    status: UpdateStatus;
    progress: number;
    message: string | null;
    setStatus: (status: UpdateStatus, message?: string) => void;
    setProgress: (progress: number) => void;
    dismiss: () => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({
    status: "idle",
    progress: 0,
    message: null,
    setStatus: (status, message) => set({ status, message: message ?? null }),
    setProgress: (progress) => set({ progress }),
    dismiss: () => set({ status: "idle", progress: 0, message: null }),
}));
