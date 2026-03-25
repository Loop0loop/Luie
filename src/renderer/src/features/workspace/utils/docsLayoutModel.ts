import type { LayoutPersistEntry } from "@renderer/features/workspace/hooks/useLayoutPersist";
import type { DocsRightTab } from "@renderer/features/workspace/stores/uiStore";
import {
  getDocsLayoutPanelSurface,
  getLayoutSurfaceConfig,
  getLayoutSurfaceDefaultRatio,
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

export const getActiveDocsRightTab = (
  isRightPanelOpen: boolean,
  docsRightTab: DocsRightTab,
  fallbackTab: DocsLayoutPanelTab | null,
): DocsLayoutPanelTab | null =>
  isRightPanelOpen ? docsRightTab ?? fallbackTab : null;

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
      layoutSurfaceRatios["docs.sidebar"] ??
      getLayoutSurfaceDefaultRatio("docs.sidebar"),
    rightPanelConfig: activePanelSurface
      ? getLayoutSurfaceConfig(activePanelSurface)
      : null,
    rightPanelRatio: activePanelSurface
      ? layoutSurfaceRatios[activePanelSurface] ??
        getLayoutSurfaceDefaultRatio(activePanelSurface)
      : null,
  };
};
