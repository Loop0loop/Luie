import type { StateCreator } from "zustand";
import { DEFAULT_UI_VIEW } from "@renderer/features/workspace/constants/uiDefaults";
import {
  buildDefaultLayoutSurfaceRatios,
  normalizeLayoutSurfaceRatiosWithMigrations,
  type LayoutSurfaceId,
} from "@renderer/shared/constants/layoutSizing";
import {
  buildDefaultSidebarWidths,
  getSynchronizedSidebarWidthFeatures,
  normalizeSidebarWidthInput,
  normalizeSidebarWidthsWithMigrations,
} from "@renderer/shared/constants/sidebarSizing";
import {
  clearFocusedClosableTarget,
  getFocusedClosableTarget,
  setFocusedClosableTarget as setTransientFocusedClosableTarget,
} from "@renderer/features/workspace/stores/closableFocusStore";
import {
  buildRegionsFromLegacyState,
  cloneRegions,
  DEFAULT_REGIONS,
  getRightPanelTabByFeature,
  normalizeRightPanelTab,
  RIGHT_PANEL_TAB_FEATURE_MAP,
} from "./uiStore.regions";
import { DEFAULT_SCRIVENER_SECTIONS } from "./uiStore.types";
import type {
  MainView,
  RightPanelContent,
  ResizablePanelData,
  ScrivenerSectionId,
  UIStore,
} from "./uiStore.types";

const DEFAULT_SIDEBAR_WIDTHS: Record<string, number> = buildDefaultSidebarWidths();
const DEFAULT_LAYOUT_SURFACE_RATIOS: Record<LayoutSurfaceId, number> =
  buildDefaultLayoutSurfaceRatios();

const buildLegacyRegionFields = (regions: UIStore["regions"]) => ({
  docsRightTab: regions.rightPanel.activeTab,
  isBinderBarOpen: regions.rightRail.open,
});

const isSameMainView = (left: MainView, right: MainView): boolean =>
  left.type === right.type && left.id === right.id;

export const buildStablePanelId = (content: RightPanelContent): string => {
  // NOTE: research 패널은 탭을 바꿔도 같은 패널 하나다. id에 tab을 넣으면 PanelGroup이
  // layout을 panel id 조합별로 캐싱(`mutableState.layouts[ids.join(",")]`)하기 때문에
  // 탭마다 폭이 따로 기억되고, 그 캐시가 defaultSize보다 우선해 공용 폭을 덮어쓴다.
  if (content.type === "research" && content.tab) {
    return "research";
  }
  if (content.type === "editor" && content.id) {
    return `editor-${content.id}`;
  }
  if (content.type === "export") {
    return "export-preview";
  }
  if (content.type === "snapshot" && content.snapshot?.id) {
    return `snapshot-${content.snapshot.id}`;
  }
  return `panel-${content.type}`;
};

export const createUIStoreState: StateCreator<UIStore, [], [], UIStore> = (set, get) => ({
  view: DEFAULT_UI_VIEW as UIStore["view"],
  worldTab: "terms",
  panels: [],
  isManuscriptMenuOpen: false,
  scrivenerSections: { ...DEFAULT_SCRIVENER_SECTIONS },
  hasHydrated: false,
  sidebarWidths: { ...DEFAULT_SIDEBAR_WIDTHS },
  layoutSurfaceRatios: { ...DEFAULT_LAYOUT_SURFACE_RATIOS },
  regions: cloneRegions(DEFAULT_REGIONS),
  ...buildLegacyRegionFields(DEFAULT_REGIONS),
  mainView: { type: "editor" } as MainView,

  setView: (view) =>
    set((state) => (state.view === view ? state : { view })),
  setWorldTab: (worldTab) =>
    set((state) => (state.worldTab === worldTab ? state : { worldTab })),

  addPanel: (content, insertAt, initialSize) => {
    let nextFocusedPanelId: string | null = null;
    set((state) => {
      if (content.type === "snapshot" && content.snapshot?.id) {
        const existingSnapshotIndex = state.panels.findIndex(
          (panel) => panel.content.type === "snapshot",
        );
        if (existingSnapshotIndex >= 0) {
          const nextPanels = [...state.panels];
          nextPanels[existingSnapshotIndex] = {
            ...nextPanels[existingSnapshotIndex],
            id: buildStablePanelId(content),
            content,
          };
          nextFocusedPanelId = nextPanels[existingSnapshotIndex].id;
          return {
            ...state,
            panels: nextPanels,
          };
        }
      }

      const incompatiblePanelType =
        content.type === "research"
          ? "editor"
          : content.type === "editor"
            ? "research"
            : null;
      const compatiblePanels = incompatiblePanelType
        ? state.panels.filter(
            (panel) => panel.content.type !== incompatiblePanelType,
          )
        : state.panels;
      const removedIncompatiblePanel =
        compatiblePanels.length !== state.panels.length;

      if (content.type === "editor") {
        const existingEditorIndex = compatiblePanels.findIndex(
          (panel) => panel.content.type === "editor",
        );
        if (existingEditorIndex >= 0) {
          const existingEditor = compatiblePanels[existingEditorIndex];
          if (
            existingEditor.content.id === content.id &&
            !removedIncompatiblePanel
          ) {
            return state;
          }
          const nextPanels = [...compatiblePanels];
          nextPanels[existingEditorIndex] = {
            ...existingEditor,
            id: buildStablePanelId(content),
            content,
          };
          nextFocusedPanelId = nextPanels[existingEditorIndex].id;
          return { panels: nextPanels };
        }
      }

      const existing = compatiblePanels.find((panel) =>
        panel.content.type === content.type &&
        (content.type === "snapshot"
          ? panel.content.snapshot?.id === content.snapshot?.id
          : panel.content.id === content.id &&
            panel.content.tab === content.tab),
      );
      if (existing || compatiblePanels.length >= 3) {
        if (!removedIncompatiblePanel) return state;
        const sizePerPanel = 100 / compatiblePanels.length;
        return {
          panels: compatiblePanels.map((panel) => ({
            ...panel,
            size: sizePerPanel,
          })),
        };
      }

      const newPanel: ResizablePanelData = {
        id: buildStablePanelId(content),
        content,
        size:
          typeof initialSize === "number" && Number.isFinite(initialSize)
            ? Math.min(90, Math.max(15, initialSize))
            : compatiblePanels.length === 0
              ? 100
              : 50,
      };
      const newPanels = [...compatiblePanels];
      if (insertAt !== undefined && insertAt >= 0 && insertAt <= newPanels.length) {
        newPanels.splice(insertAt, 0, newPanel);
      } else {
        newPanels.push(newPanel);
      }
      if (initialSize === undefined || !Number.isFinite(initialSize)) {
        const sizePerPanel = 100 / newPanels.length;
        for (let index = 0; index < newPanels.length; index += 1) {
          newPanels[index] = { ...newPanels[index], size: sizePerPanel };
        }
      }
      nextFocusedPanelId = newPanel.id;
      return {
        ...state,
        panels: newPanels,
      };
    });
    if (nextFocusedPanelId) {
      setTransientFocusedClosableTarget({ kind: "panel", id: nextFocusedPanelId });
    }
  },
  removePanel: (id) => {
    const focusedTarget = getFocusedClosableTarget();
    set((state) => {
      // NOTE: 남은 패널 크기를 100/n으로 재분배하면 안 된다. 이 패널들은 원고 패널
      // (`main-primary-content`)과 같은 group을 공유하지만 그 패널은 `panels`에 없어서
      // 100/n이 애초에 group 비율과 무관하다. 재분배하면 사용자가 조정한 폭이 파괴되고
      // 그 값이 그대로 저장된다. PanelGroup이 남은 값을 정규화하므로 그대로 두면 된다.
      const newPanels = state.panels.filter((panel) => panel.id !== id);
      return { panels: newPanels };
    });
    if (focusedTarget?.kind === "panel" && focusedTarget.id === id) {
      clearFocusedClosableTarget();
    }
  },
  updatePanelSize: (id, size) =>
    set((state) => {
      if (!Number.isFinite(size)) return state;
      const panel = state.panels.find((item) => item.id === id);
      // PanelGroup은 같은 layout도 다시 emit한다. 동일한 size를 저장하면 재계산 루프가 된다.
      if (!panel || Math.abs(panel.size - size) < 0.1) return state;
      return {
        panels: state.panels.map((item) =>
          item.id === id ? { ...item, size } : item,
        ),
      };
    }),
  setPanels: (panels) => set({ panels }),

  setManuscriptMenuOpen: (isManuscriptMenuOpen) =>
    set((state) =>
      state.isManuscriptMenuOpen === isManuscriptMenuOpen
        ? state
        : { isManuscriptMenuOpen }),
  setScrivenerSectionOpen: (section, isOpen) =>
    set((state) => {
      if (state.scrivenerSections[section] === isOpen) return state;
      return {
        scrivenerSections: {
          ...state.scrivenerSections,
          [section]: isOpen,
        },
      };
    }),
  setScrivenerSections: (sections) =>
    set((state) => {
      const nextSections = {
        ...state.scrivenerSections,
        ...sections,
      };
      const unchanged = (Object.keys(DEFAULT_SCRIVENER_SECTIONS) as ScrivenerSectionId[])
        .every((section) => state.scrivenerSections[section] === nextSections[section]);
      return unchanged ? state : { scrivenerSections: nextSections };
    }),
  setMainView: (mainView) =>
    set((state) =>
      isSameMainView(state.mainView, mainView)
        ? state
        : { mainView }),
  setSidebarWidth: (feature, width) =>
    set((state) => {
      const targetFeatures = [feature, ...getSynchronizedSidebarWidthFeatures(feature)];
      const uniqueTargetFeatures = Array.from(new Set(targetFeatures));
      const nextSidebarWidths = { ...state.sidebarWidths };
      const nextRegions = cloneRegions(state.regions);
      let didUpdate = false;

      for (const targetFeature of uniqueTargetFeatures) {
        const next = normalizeSidebarWidthInput(targetFeature, width);
        if (next === null) continue;
        const prev = normalizeSidebarWidthInput(
          targetFeature,
          state.sidebarWidths[targetFeature],
        );
        if (prev !== null && Math.abs(prev - next) < 2) continue;
        nextSidebarWidths[targetFeature] = next;
        if (
          targetFeature === "mainSidebar" ||
          targetFeature === "docsBinder" ||
          targetFeature === "scrivenerBinder" ||
          targetFeature === "binder"
        ) {
          nextRegions.leftSidebar.widthPx = next;
        }
        const targetTab = getRightPanelTabByFeature(targetFeature);
        if (targetTab) {
          nextRegions.rightPanel.widthByTab[targetTab] = next;
        }
        didUpdate = true;
      }

      if (!didUpdate) return state;
      return {
        sidebarWidths: nextSidebarWidths,
        regions: nextRegions,
        ...buildLegacyRegionFields(nextRegions),
      };
    }),
  setSidebarWidths: (widths) =>
    set((state) => {
      const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations({
        ...state.sidebarWidths,
        ...widths,
      });
      const nextRegions = buildRegionsFromLegacyState({
        sidebarWidths: normalizedSidebarWidths,
        regions: state.regions,
      });
      return {
        sidebarWidths: normalizedSidebarWidths,
        regions: nextRegions,
        ...buildLegacyRegionFields(nextRegions),
      };
    }),
  setLayoutSurfaceRatio: (surface, ratio) =>
    set((state) => {
      const normalizedRatios = normalizeLayoutSurfaceRatiosWithMigrations({
        ...state.layoutSurfaceRatios,
        [surface]: ratio,
      });
      const nextRatio = normalizedRatios[surface];
      const previousRatio = state.layoutSurfaceRatios[surface];
      if (Math.abs(previousRatio - nextRatio) < 0.1) {
        return state;
      }

      return {
        layoutSurfaceRatios: {
          ...state.layoutSurfaceRatios,
          [surface]: nextRatio,
        },
      };
    }),
  setLayoutSurfaceRatios: (ratios) =>
    set((state) => {
      const normalizedRatios = normalizeLayoutSurfaceRatiosWithMigrations(
        {
          ...state.layoutSurfaceRatios,
          ...ratios,
        },
        state.sidebarWidths,
      );
      return {
        layoutSurfaceRatios: normalizedRatios,
      };
    }),
  setRegionOpen: (region, open) => {
    set((state) => {
      if (state.regions[region].open === open) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions[region].open = open;
      if (region === "rightPanel" && !open) {
        nextRegions.rightPanel.activeTab = null;
      }
      return { regions: nextRegions, ...buildLegacyRegionFields(nextRegions) };
    });
    if (
      region === "rightPanel" &&
      !open &&
      getFocusedClosableTarget()?.kind === "docs-tab"
    ) {
      clearFocusedClosableTarget();
    }
  },
  setRegionWidth: (region, width) =>
    set((state) => {
      if (region === "leftSidebar") {
        const normalized = normalizeSidebarWidthInput("mainSidebar", width);
        if (normalized === null) return state;
        const nextRegions = cloneRegions(state.regions);
        if (Math.abs(nextRegions.leftSidebar.widthPx - normalized) < 2) {
          return state;
        }
        nextRegions.leftSidebar.widthPx = normalized;
        return {
          regions: nextRegions,
          ...buildLegacyRegionFields(nextRegions),
          sidebarWidths: {
            ...state.sidebarWidths,
            mainSidebar: normalized,
          },
        };
      }

      const activeTab = state.regions.rightPanel.activeTab ?? "character";
      const targetFeature = RIGHT_PANEL_TAB_FEATURE_MAP[activeTab];
      const normalized = normalizeSidebarWidthInput(targetFeature, width);
      if (normalized === null) return state;
      const nextRegions = cloneRegions(state.regions);
      if (Math.abs(nextRegions.rightPanel.widthByTab[activeTab] - normalized) < 2) {
        return state;
      }
      nextRegions.rightPanel.widthByTab[activeTab] = normalized;
      return {
        regions: nextRegions,
        ...buildLegacyRegionFields(nextRegions),
        sidebarWidths: {
          ...state.sidebarWidths,
          [targetFeature]: normalized,
        },
      };
    }),
  openRightPanelTab: (tab) => {
    set((state) => {
      const nextTab = normalizeRightPanelTab(tab);
      if (!nextTab) return state;
      const isAlreadyOpen =
        state.regions.rightPanel.open &&
        state.regions.rightPanel.activeTab === nextTab;
      if (isAlreadyOpen) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.rightPanel.open = true;
      nextRegions.rightPanel.activeTab = nextTab;
      return { regions: nextRegions, ...buildLegacyRegionFields(nextRegions) };
    });
    setTransientFocusedClosableTarget({ kind: "docs-tab" });
  },
  closeRightPanel: () => {
    set((state) => {
      if (!state.regions.rightPanel.open) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.rightPanel.open = false;
      nextRegions.rightPanel.activeTab = null;
      return { regions: nextRegions, ...buildLegacyRegionFields(nextRegions) };
    });
    if (getFocusedClosableTarget()?.kind === "docs-tab") {
      clearFocusedClosableTarget();
    }
  },
  toggleLeftSidebar: () =>
    set((state) => {
      const nextOpen = !state.regions.leftSidebar.open;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.leftSidebar.open = nextOpen;
      return { regions: nextRegions, ...buildLegacyRegionFields(nextRegions) };
    }),
  setRightPanelWidth: (tab, width) =>
    set((state) => {
      const normalizedTab = normalizeRightPanelTab(tab);
      if (!normalizedTab) return state;
      const targetFeature = RIGHT_PANEL_TAB_FEATURE_MAP[normalizedTab];
      const normalizedWidth = normalizeSidebarWidthInput(targetFeature, width);
      if (normalizedWidth === null) return state;
      const currentWidth = state.regions.rightPanel.widthByTab[normalizedTab];
      if (Math.abs(currentWidth - normalizedWidth) < 2) return state;
      const nextRegions = cloneRegions(state.regions);
      nextRegions.rightPanel.widthByTab[normalizedTab] = normalizedWidth;
      return {
        regions: nextRegions,
        ...buildLegacyRegionFields(nextRegions),
        sidebarWidths: {
          ...state.sidebarWidths,
          [targetFeature]: normalizedWidth,
        },
      };
    }),
  setHasHydrated: (hasHydrated) =>
    set((state) => (state.hasHydrated === hasHydrated ? state : { hasHydrated })),
  setFocusedClosableTarget: (focusedClosableTarget) => {
    setTransientFocusedClosableTarget(focusedClosableTarget);
  },
  closeFocusedSurface: () => {
    const focusedKind = getFocusedClosableTarget()?.kind;

    // NOTE: compact-binder는 component-local state라 DOM event로 닫기 요청을 전달한다.
    // NOTE: snapshot viewer와 binder tab의 우선순위는 호출 component가 결정한다.
    if (focusedKind === "compact-binder") {
      clearFocusedClosableTarget();
      window.dispatchEvent(new CustomEvent("luie:close-compact-binder"));
      return true;
    }

    const focusedTarget = getFocusedClosableTarget();
    const currentState = get();
    const isRightPanelOpen = currentState.regions.rightPanel.open;

    // NOTE: 분할 패널 닫기(cmd+W 포함)는 state에서 직접 제거하지 않고 WorkspacePanels에
    // 위임한다. X 닫기와 동일한 close 애니메이션 경로를 타야 하기 때문이다.
    // 우측 패널이 열려 있으면 우측 패널이 우선이므로 패널 제거로 넘어가지 않는다.
    const targetPanelId =
      focusedTarget?.kind === "panel" &&
      currentState.panels.some((panel) => panel.id === focusedTarget.id)
        ? focusedTarget.id
        : !isRightPanelOpen && currentState.panels.length > 0
          ? currentState.panels[currentState.panels.length - 1]?.id
          : undefined;

    if (targetPanelId) {
      clearFocusedClosableTarget();
      window.dispatchEvent(
        new CustomEvent("luie:close-workspace-panel", {
          detail: { panelId: targetPanelId },
        }),
      );
      return true;
    }

    let handled = false;
    set((state) => {
      const focusedTarget = getFocusedClosableTarget();

      if (focusedTarget?.kind === "docs-tab" && state.regions.rightPanel.open) {
        handled = true;
        const nextRegions = cloneRegions(state.regions);
        nextRegions.rightPanel.open = false;
        nextRegions.rightPanel.activeTab = null;
        return { regions: nextRegions, ...buildLegacyRegionFields(nextRegions) };
      }

      if (state.regions.rightPanel.open) {
        handled = true;
        const nextRegions = cloneRegions(state.regions);
        nextRegions.rightPanel.open = false;
        nextRegions.rightPanel.activeTab = null;
        return { regions: nextRegions, ...buildLegacyRegionFields(nextRegions) };
      }

      return state;
    });
    if (handled) {
      clearFocusedClosableTarget();
    }
    return handled;
  },
});
