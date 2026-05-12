import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SidebarWidthFeature } from "@shared/constants/sidebarSizing";

type CollapsedSidebarStore = {
  collapsedSidebars: Record<string, boolean>;
  hasHydrated: boolean;
  setCollapsedSidebar: (feature: SidebarWidthFeature, collapsed: boolean) => void;
  _setHydrated: () => void;
};

export const useCollapsedSidebarStore = create<CollapsedSidebarStore>()(
  persist(
    (set) => ({
      collapsedSidebars: {},
      hasHydrated: false,
      setCollapsedSidebar: (feature, collapsed) =>
        set((state) => ({
          collapsedSidebars: {
            ...state.collapsedSidebars,
            [feature]: collapsed,
          },
        })),
      _setHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "luie:research-sidebar-collapsed",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
