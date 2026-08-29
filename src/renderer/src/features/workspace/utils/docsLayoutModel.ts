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

/**
 * 우측 패널의 `Panel.id`. surface와 같은 단위로 묶어야 한다.
 *
 * PanelGroup은 layout을 panel id 조합별로 캐싱하고(`mutableState.layouts[ids.join(",")]`)
 * 그 캐시가 `defaultSize`보다 우선한다. id를 탭별로 두면 공용 폭을 저장해도 탭마다 폭이
 * 따로 기억되어, 탭을 닫았다 다른 탭을 열면 그 탭이 마지막에 가졌던 폭이 나온다.
 */
export const getDocsRightPanelId = (tab: DocsLayoutPanelTab): string =>
  `right-context-panel-${getDocsLayoutPanelSurface(tab).replace("docs.panel.", "")}`;

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
  // NOTE: canvas 등 editor 전용 tab은 DocsLayoutPanelTabs에 포함하지 않는다.
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

  const rawSidebarRatio = layoutSurfaceRatios["docs.sidebar"];
  const defaultSidebarRatio = getLayoutSurfaceDefaultRatio("docs.sidebar");
  const docsSidebarRatio =
    typeof rawSidebarRatio === "number" && rawSidebarRatio >= 5
      ? rawSidebarRatio
      : defaultSidebarRatio;

  const rawRightRatio = activePanelSurface
    ? layoutSurfaceRatios[activePanelSurface]
    : null;
  const defaultRightRatio = activePanelSurface
    ? getLayoutSurfaceDefaultRatio(activePanelSurface)
    : null;
  const rightPanelRatio =
    typeof rawRightRatio === "number" && rawRightRatio >= 5
      ? rawRightRatio
      : defaultRightRatio;

  return {
    activePanelSurface,
    docsSidebarConfig: getLayoutSurfaceConfig("docs.sidebar"),
    docsSidebarRatio,
    rightPanelConfig: activePanelSurface
      ? getLayoutSurfaceConfig(activePanelSurface)
      : null,
    rightPanelRatio,
  };
};
