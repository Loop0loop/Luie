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
} from "@renderer/shared/constants/layoutSizing";

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

export const buildDocsSidebarLayoutPersistEntries = (): LayoutPersistEntry[] => [
  { id: "left-sidebar", index: 0, surface: "docs.sidebar" },
];

export const buildDocsRightLayoutPersistEntries = (
  activeRightTab: DocsLayoutPanelTab | null,
): LayoutPersistEntry[] =>
  activeRightTab
    ? [
        {
          id: getDocsRightPanelId(activeRightTab),
          index: 1,
          surface: getDocsLayoutPanelSurface(activeRightTab),
        },
      ]
    : [];

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
