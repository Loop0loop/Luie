import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SidebarWidthFeature } from "@shared/constants/sidebarSizing";

type CollapsedSidebarStore = {
  collapsedSidebars: Record<string, boolean>;
  setCollapsedSidebar: (feature: SidebarWidthFeature, collapsed: boolean) => void;
};

export const useCollapsedSidebarStore = create<CollapsedSidebarStore>()(
  persist(
    (set) => ({
      collapsedSidebars: {},
      setCollapsedSidebar: (feature, collapsed) =>
        set((state) => ({
          collapsedSidebars: {
            ...state.collapsedSidebars,
            [feature]: collapsed,
          },
        })),
    }),
    {
      name: "luie:research-sidebar-collapsed",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
