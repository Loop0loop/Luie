import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildUiStorePersistOptions } from "./uiStore.persist";
import { createUIStoreState } from "./uiStore.state";
import type { UIStore } from "./uiStore.types";

export type {
  ContextTab,
  DocsRightTab,
  MainView,
  RegionId,
  ResizablePanelData,
  ResearchTab,
  RightPanelContent,
  RightPanelTab,
  ScrivenerSectionId,
  ScrivenerSectionsState,
  SidebarFeature,
  UIRegionsState,
  UIStore,
  WorldTab,
} from "./uiStore.types";
export const useUIStore = create<UIStore>()(
  persist(
    createUIStoreState,
    buildUiStorePersistOptions(),
  ),
);
