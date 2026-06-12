import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SidebarWidthFeature } from "@renderer/shared/constants/sidebarSizing";

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
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) =>
        (persistedState as Partial<CollapsedSidebarStore>) ?? {
          collapsedSidebars: {},
          hasHydrated: false,
        },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<CollapsedSidebarStore>),
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
