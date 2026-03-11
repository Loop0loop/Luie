import {
  DEFAULT_UI_CONTEXT_OPEN,
  DEFAULT_UI_SIDEBAR_OPEN,
} from "@shared/constants";
import {
  buildDefaultSidebarWidths,
  getSidebarDefaultWidth,
  normalizeSidebarWidthInput,
  normalizeSidebarWidthsWithMigrations,
  type SidebarWidthFeature,
} from "@shared/constants/sidebarSizing";
import type {
  DocsRightTab,
  RightPanelTab,
  ScrivenerSectionsState,
  UIRegionsState,
} from "./uiStore.types";
import { DEFAULT_SCRIVENER_SECTIONS } from "./uiStore.types";

const DEFAULT_SIDEBAR_WIDTHS: Record<string, number> = buildDefaultSidebarWidths();

export const RIGHT_PANEL_TABS = [
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "analysis",
  "snapshot",
  "trash",
  "editor",
  "export",
] as const satisfies readonly RightPanelTab[];

export const RIGHT_PANEL_TAB_FEATURE_MAP: Record<RightPanelTab, SidebarWidthFeature> = {
  character: "docsCharacter",
  event: "docsEvent",
  faction: "docsFaction",
  world: "docsWorld",
  scrap: "docsScrap",
  analysis: "docsAnalysis",
  snapshot: "docsSnapshot",
  trash: "docsTrash",
  editor: "docsEditor",
  export: "docsExport",
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const getRightPanelTabByFeature = (feature: string): RightPanelTab | null => {
  switch (feature) {
    case "docsCharacter":
    case "editorCharacter":
    case "character":
      return "character";
    case "docsEvent":
    case "event":
      return "event";
    case "docsFaction":
    case "faction":
      return "faction";
    case "docsWorld":
    case "editorWorld":
    case "world":
      return "world";
    case "docsScrap":
    case "editorScrap":
    case "scrap":
      return "scrap";
    case "docsAnalysis":
    case "editorAnalysis":
    case "analysis":
      return "analysis";
    case "docsSnapshot":
    case "editorSnapshot":
    case "snapshot":
      return "snapshot";
    case "docsTrash":
    case "editorTrash":
    case "trash":
      return "trash";
    case "docsEditor":
    case "editor":
      return "editor";
    case "docsExport":
    case "export":
      return "export";
    default:
      return null;
  }
};

export const buildDefaultRightPanelWidths = (): Record<RightPanelTab, number> =>
  Object.fromEntries(
    RIGHT_PANEL_TABS.map((tab) => [
      tab,
      getSidebarDefaultWidth(RIGHT_PANEL_TAB_FEATURE_MAP[tab]),
    ]),
  ) as Record<RightPanelTab, number>;

export const normalizeRightPanelTab = (value: unknown): RightPanelTab | null => {
  if (typeof value !== "string") return null;
  return RIGHT_PANEL_TABS.includes(value as RightPanelTab)
    ? (value as RightPanelTab)
    : null;
};

export const buildRegionsFromLegacyState = (legacy: {
  isSidebarOpen?: boolean;
  isContextOpen?: boolean;
  docsRightTab?: DocsRightTab;
  isBinderBarOpen?: boolean;
  scrivenerSidebarOpen?: boolean;
  scrivenerInspectorOpen?: boolean;
  sidebarWidths?: Record<string, number>;
  regions?: unknown;
}): UIRegionsState => {
  const normalizedSidebarWidths = normalizeSidebarWidthsWithMigrations(legacy.sidebarWidths);
  const defaultRightPanelWidths = buildDefaultRightPanelWidths();
  const fallbackActiveTab = normalizeRightPanelTab(legacy.docsRightTab);
  const persistedRegions = isRecord(legacy.regions) ? legacy.regions : null;
  const persistedLeft =
    persistedRegions && isRecord(persistedRegions.leftSidebar)
      ? persistedRegions.leftSidebar
      : null;
  const persistedRightPanel =
    persistedRegions && isRecord(persistedRegions.rightPanel)
      ? persistedRegions.rightPanel
      : null;
  const persistedRightRail =
    persistedRegions && isRecord(persistedRegions.rightRail)
      ? persistedRegions.rightRail
      : null;
  const persistedWidthByTab =
    persistedRightPanel && isRecord(persistedRightPanel.widthByTab)
      ? persistedRightPanel.widthByTab
      : null;

  const widthByTab = { ...defaultRightPanelWidths };
  RIGHT_PANEL_TABS.forEach((tab) => {
    const persistedWidth = persistedWidthByTab ? persistedWidthByTab[tab] : undefined;
    const normalizedPersistedWidth = normalizeSidebarWidthInput(
      RIGHT_PANEL_TAB_FEATURE_MAP[tab],
      persistedWidth,
    );
    if (normalizedPersistedWidth !== null) {
      widthByTab[tab] = normalizedPersistedWidth;
      return;
    }
    const legacyWidth = normalizeSidebarWidthInput(
      RIGHT_PANEL_TAB_FEATURE_MAP[tab],
      normalizedSidebarWidths[RIGHT_PANEL_TAB_FEATURE_MAP[tab]],
    );
    if (legacyWidth !== null) {
      widthByTab[tab] = legacyWidth;
    }
  });

  const legacyLeftWidth = normalizeSidebarWidthInput(
    "mainSidebar",
    normalizedSidebarWidths.mainSidebar,
  );
  const leftWidthFromRegions = normalizeSidebarWidthInput(
    "mainSidebar",
    persistedLeft?.widthPx,
  );
  const leftSidebarWidthPx =
    leftWidthFromRegions ??
    legacyLeftWidth ??
    getSidebarDefaultWidth("mainSidebar");

  const activeTabFromRegions = normalizeRightPanelTab(persistedRightPanel?.activeTab);
  const activeTab = activeTabFromRegions ?? fallbackActiveTab;

  const leftOpenFromRegions =
    typeof persistedLeft?.open === "boolean" ? persistedLeft.open : undefined;
  const rightOpenFromRegions =
    typeof persistedRightPanel?.open === "boolean"
      ? persistedRightPanel.open
      : undefined;
  const rightRailOpenFromRegions =
    typeof persistedRightRail?.open === "boolean" ? persistedRightRail.open : undefined;

  return {
    leftSidebar: {
      open:
        leftOpenFromRegions ??
        (typeof legacy.isSidebarOpen === "boolean"
          ? legacy.isSidebarOpen
          : typeof legacy.scrivenerSidebarOpen === "boolean"
            ? legacy.scrivenerSidebarOpen
            : DEFAULT_UI_SIDEBAR_OPEN),
      widthPx: leftSidebarWidthPx,
    },
    rightPanel: {
      open:
        rightOpenFromRegions ??
        (activeTab !== null
          ? true
          : typeof legacy.isContextOpen === "boolean"
            ? legacy.isContextOpen
            : typeof legacy.scrivenerInspectorOpen === "boolean"
              ? legacy.scrivenerInspectorOpen
              : DEFAULT_UI_CONTEXT_OPEN),
      activeTab,
      widthByTab,
    },
    rightRail: {
      open:
        rightRailOpenFromRegions ??
        (typeof legacy.isBinderBarOpen === "boolean" ? legacy.isBinderBarOpen : true),
    },
  };
};

export const DEFAULT_REGIONS: UIRegionsState = buildRegionsFromLegacyState({
  isSidebarOpen: DEFAULT_UI_SIDEBAR_OPEN,
  isContextOpen: DEFAULT_UI_CONTEXT_OPEN,
  docsRightTab: null,
  isBinderBarOpen: true,
  scrivenerSidebarOpen: true,
  scrivenerInspectorOpen: true,
  sidebarWidths: DEFAULT_SIDEBAR_WIDTHS,
});

export const cloneRegions = (regions: UIRegionsState): UIRegionsState => ({
  leftSidebar: { ...regions.leftSidebar },
  rightPanel: {
    ...regions.rightPanel,
    widthByTab: { ...regions.rightPanel.widthByTab },
  },
  rightRail: { ...regions.rightRail },
});

export const mergeScrivenerSections = (
  input: unknown,
): ScrivenerSectionsState => ({
  ...DEFAULT_SCRIVENER_SECTIONS,
  ...(isRecord(input) ? (input as Partial<ScrivenerSectionsState>) : {}),
});
