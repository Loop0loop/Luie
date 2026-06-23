import { create } from "zustand";

interface DataRecoveryState {
    hasRecovered: boolean;
    recoveryReason: "missing" | "corrupt" | "conflict" | null;
    recoveryPath?: string;
    setRecoveryState: (recovered: boolean, reason?: "missing" | "corrupt" | "conflict", path?: string) => void;
    dismissRecovery: () => void;
}

export const useDataRecoveryStore = create<DataRecoveryState>((set) => ({
    hasRecovered: false,
    recoveryReason: null,
    recoveryPath: undefined,
    setRecoveryState: (recovered, reason, path) =>
        set({ hasRecovered: recovered, recoveryReason: reason ?? null, recoveryPath: path }),
    dismissRecovery: () => set({ hasRecovered: false, recoveryReason: null, recoveryPath: undefined }),
}));
