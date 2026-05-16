import type { LayoutPersistEntry } from "@renderer/features/workspace/hooks/useLayoutPersist";
import type { DocsRightTab } from "@renderer/features/workspace/stores/uiStore";
import {
  getDocsLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
  DOCS_LAYOUT_PANEL_SURFACE_MAP,
  type DocsLayoutPanelTab,
  type LayoutSurfaceConfig,
  type LayoutSurfaceId,
} from "@shared/constants/layoutSizing";

export type DocsLayoutSurfaceState = {
  activePanelSurface: LayoutSurfaceId | null;
  docsSidebarConfig: LayoutSurfaceConfig;
  docsSidebarRatio: number;
  rightPanelConfig: LayoutSurfaceConfig | null;
  rightPanelRatio: number | null;
};

export const getDocsRightPanelId = (tab: DocsLayoutPanelTab): string =>
  `right-context-panel-${tab}`;

const isDocsLayoutPanelTab = (tab: DocsRightTab): tab is DocsLayoutPanelTab =>
  tab !== null &&
  Object.prototype.hasOwnProperty.call(DOCS_LAYOUT_PANEL_SURFACE_MAP, tab);

export const getActiveDocsRightTab = (
  isRightPanelOpen: boolean,
  docsRightTab: DocsRightTab,
  fallbackTab: DocsRightTab,
): DocsLayoutPanelTab | null => {
  if (!isRightPanelOpen) return null;
  const candidate = docsRightTab ?? fallbackTab;
  if (candidate === null) return null;
  // canvas and other editor-only tabs are not valid DocsLayoutPanelTabs.
  return isDocsLayoutPanelTab(candidate) ? candidate : (isDocsLayoutPanelTab(fallbackTab) ? fallbackTab : null);
};

export const buildDocsLayoutPersistEntries = (
  activeRightTab: DocsLayoutPanelTab | null,
): LayoutPersistEntry[] => {
  const entries: LayoutPersistEntry[] = [
    { id: "left-sidebar", surface: "docs.sidebar" },
  ];

  if (activeRightTab) {
    entries.push({
      id: getDocsRightPanelId(activeRightTab),
      surface: getDocsLayoutPanelSurface(activeRightTab),
    });
  }

  return entries;
};

export const getDocsLayoutSurfaceState = (
  layoutSurfaceRatios: Record<LayoutSurfaceId, number>,
  activeRightTab: DocsLayoutPanelTab | null,
): DocsLayoutSurfaceState => {
  const activePanelSurface = activeRightTab
    ? getDocsLayoutPanelSurface(activeRightTab)
    : null;

  return {
    activePanelSurface,
    docsSidebarConfig: getLayoutSurfaceConfig("docs.sidebar"),
    docsSidebarRatio:
      layoutSurfaceRatios["docs.sidebar"] ||
      getLayoutSurfaceDefaultRatio("docs.sidebar"),
    rightPanelConfig: activePanelSurface
      ? getLayoutSurfaceConfig(activePanelSurface)
      : null,
    rightPanelRatio: activePanelSurface
      ? layoutSurfaceRatios[activePanelSurface] ||
        getLayoutSurfaceDefaultRatio(activePanelSurface)
      : null,
  };
};
