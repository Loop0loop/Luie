// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  openDocsBinderTab,
  openEditorBinderTab,
  setDocsBinderRailOpen,
  setDocsSidebarOpen,
} from "../../../src/renderer/src/features/workspace/services/layoutRegionActions.js";
import { useUIStore } from "../../../src/renderer/src/features/workspace/stores/uiStore.js";

type ResettableStore = {
  getInitialState: () => unknown;
  setState: (state: unknown, replace?: boolean) => void;
};

const resetStore = (store: ResettableStore): void => {
  store.setState(store.getInitialState(), true);
};

describe("layoutRegionActions", () => {
  beforeEach(() => {
    resetStore(useUIStore as unknown as ResettableStore);
    useUIStore.setState((state) => ({
      isBinderBarOpen: false,
      isSidebarOpen: false,
      docsRightTab: null,
      regions: {
        ...state.regions,
        leftSidebar: {
          ...state.regions.leftSidebar,
          open: false,
        },
        rightPanel: {
          ...state.regions.rightPanel,
          activeTab: null,
          open: false,
        },
        rightRail: {
          ...state.regions.rightRail,
          open: false,
        },
      },
    }));
  });

  it("opens docs binder tabs without opening the left sidebar", () => {
    openDocsBinderTab("character");

    const state = useUIStore.getState();
    expect(state.regions.rightRail.open).toBe(true);
    expect(state.isBinderBarOpen).toBe(true);
    expect(state.regions.rightPanel.open).toBe(true);
    expect(state.docsRightTab).toBe("character");
    expect(state.regions.leftSidebar.open).toBe(false);
    expect(state.isSidebarOpen).toBe(false);
  });

  it("opens editor binder tabs without opening the left sidebar", () => {
    openEditorBinderTab("event");

    const state = useUIStore.getState();
    expect(state.regions.rightRail.open).toBe(true);
    expect(state.regions.rightPanel.open).toBe(true);
    expect(state.docsRightTab).toBe("event");
    expect(state.regions.leftSidebar.open).toBe(false);
    expect(state.isSidebarOpen).toBe(false);
  });

  it("keeps sidebar and binder rail controls independent", () => {
    setDocsBinderRailOpen(true);
    expect(useUIStore.getState().regions.leftSidebar.open).toBe(false);

    setDocsSidebarOpen(true);
    expect(useUIStore.getState().regions.leftSidebar.open).toBe(true);
    expect(useUIStore.getState().regions.rightRail.open).toBe(true);

    setDocsBinderRailOpen(false);
    expect(useUIStore.getState().regions.leftSidebar.open).toBe(true);
    expect(useUIStore.getState().regions.rightRail.open).toBe(false);
  });
});
