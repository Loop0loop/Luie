export type SidebarWidthFeature =
  | "mainSidebar"
  | "mainContext"
  | "docsBinder"
  | "scrivenerBinder"
  | "scrivenerInspector"
  | "docsCharacter"
  | "docsEvent"
  | "docsFaction"
  | "docsWorld"
  | "docsScrap"
  | "docsAnalysis"
  | "docsSnapshot"
  | "docsTrash"
  | "docsEditor"
  | "docsExport"
  | "editorCharacter"
  | "editorWorld"
  | "editorScrap"
  | "editorAnalysis"
  | "editorSnapshot"
  | "editorTrash"
  | "character"
  | "event"
  | "faction"
  | "world"
  | "scrap"
  | "analysis"
  | "snapshot"
  | "trash"
  | "memo"
  | "editor"
  | "export"
  | "characterSidebar"
  | "eventSidebar"
  | "factionSidebar"
  | "memoSidebar"
  | "worldGraphSidebar"
  | "worldGraphInspector"
  | "binder"
  | "context"
  | "inspector";

export type SidebarWidthConfig = {
  minPx: number;
  maxPx: number;
  defaultPx: number;
};

const PANEL_SIDEBAR_WIDTH_CONFIG: SidebarWidthConfig = {
  minPx: 150,
  maxPx: 250,
  defaultPx: 200,
};

const PANEL_WIDTH_CONFIG: SidebarWidthConfig = {
  minPx: 400,
  maxPx: 1000,
  defaultPx: 600,
};

export const SIDEBAR_WIDTH_CONFIG: Record<SidebarWidthFeature, SidebarWidthConfig> = {
  mainSidebar: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  mainContext: { ...PANEL_WIDTH_CONFIG },
  docsBinder: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  scrivenerBinder: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  scrivenerInspector: { ...PANEL_WIDTH_CONFIG },
  docsCharacter: { ...PANEL_WIDTH_CONFIG },
  docsEvent: { ...PANEL_WIDTH_CONFIG },
  docsFaction: { ...PANEL_WIDTH_CONFIG },
  docsWorld: { ...PANEL_WIDTH_CONFIG },
  docsScrap: { ...PANEL_WIDTH_CONFIG },
  docsAnalysis: { ...PANEL_WIDTH_CONFIG },
  docsSnapshot: { ...PANEL_WIDTH_CONFIG },
  docsTrash: { ...PANEL_WIDTH_CONFIG },
  docsEditor: { ...PANEL_WIDTH_CONFIG },
  docsExport: { ...PANEL_WIDTH_CONFIG },
  editorCharacter: { ...PANEL_WIDTH_CONFIG },
  editorWorld: { ...PANEL_WIDTH_CONFIG },
  editorScrap: { ...PANEL_WIDTH_CONFIG },
  editorAnalysis: { ...PANEL_WIDTH_CONFIG },
  editorSnapshot: { ...PANEL_WIDTH_CONFIG },
  editorTrash: { ...PANEL_WIDTH_CONFIG },
  // Legacy shared right-panel keys (read only for migration)
  character: { ...PANEL_WIDTH_CONFIG },
  event: { ...PANEL_WIDTH_CONFIG },
  faction: { ...PANEL_WIDTH_CONFIG },
  world: { ...PANEL_WIDTH_CONFIG },
  scrap: { ...PANEL_WIDTH_CONFIG },
  analysis: { ...PANEL_WIDTH_CONFIG },
  snapshot: { ...PANEL_WIDTH_CONFIG },
  trash: { ...PANEL_WIDTH_CONFIG },
  memo: { ...PANEL_WIDTH_CONFIG },
  editor: { ...PANEL_WIDTH_CONFIG },
  export: { ...PANEL_WIDTH_CONFIG },
  characterSidebar: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  eventSidebar: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  factionSidebar: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  memoSidebar: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  worldGraphSidebar: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  worldGraphInspector: { ...PANEL_WIDTH_CONFIG },
  binder: { ...PANEL_SIDEBAR_WIDTH_CONFIG },
  context: { ...PANEL_WIDTH_CONFIG },
  inspector: { ...PANEL_WIDTH_CONFIG },
};

const FALLBACK_MIN_PX = 120;
const FALLBACK_MAX_PX = 2000;
const FALLBACK_DEFAULT_PX = 320;

const getNumeric = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.round(Math.min(max, Math.max(min, value)));

export const isSidebarWidthFeature = (feature: string): feature is SidebarWidthFeature =>
  feature in SIDEBAR_WIDTH_CONFIG;

export const getSidebarWidthConfig = (feature: string): SidebarWidthConfig =>
  isSidebarWidthFeature(feature)
    ? SIDEBAR_WIDTH_CONFIG[feature]
    : {
      minPx: FALLBACK_MIN_PX,
      maxPx: FALLBACK_MAX_PX,
      defaultPx: FALLBACK_DEFAULT_PX,
    };

export const clampSidebarWidth = (feature: SidebarWidthFeature, widthPx: number): number => {
  const config = SIDEBAR_WIDTH_CONFIG[feature];
  return clampNumber(widthPx, config.minPx, config.maxPx);
};

export const clampSidebarWidthForAnyFeature = (feature: string, widthPx: number): number => {
  const config = getSidebarWidthConfig(feature);
  return clampNumber(widthPx, config.minPx, config.maxPx);
};

export const getSidebarDefaultWidth = (feature: SidebarWidthFeature): number =>
  SIDEBAR_WIDTH_CONFIG[feature].defaultPx;

export const buildDefaultSidebarWidths = (): Record<SidebarWidthFeature, number> =>
  Object.fromEntries(
    (Object.keys(SIDEBAR_WIDTH_CONFIG) as SidebarWidthFeature[]).map((feature) => [
      feature,
      SIDEBAR_WIDTH_CONFIG[feature].defaultPx,
    ]),
  ) as Record<SidebarWidthFeature, number>;

const SIDEBAR_WIDTH_SYNC_GROUPS: SidebarWidthFeature[][] = [
  ["mainSidebar", "docsBinder", "scrivenerBinder", "binder"],
  ["mainContext", "scrivenerInspector", "context", "inspector"],
  ["docsCharacter", "editorCharacter", "character"],
  ["docsEvent", "event"],
  ["docsFaction", "faction"],
  ["docsWorld", "editorWorld", "world"],
  ["docsScrap", "editorScrap", "scrap"],
  ["docsAnalysis", "editorAnalysis", "analysis"],
  ["docsSnapshot", "editorSnapshot", "snapshot"],
  ["docsTrash", "editorTrash", "trash"],
  ["docsEditor", "editor"],
  ["docsExport", "export"],
];

export const getSynchronizedSidebarWidthFeatures = (
  feature: string,
): SidebarWidthFeature[] => {
  if (!isSidebarWidthFeature(feature)) return [];
  const group = SIDEBAR_WIDTH_SYNC_GROUPS.find((syncGroup) =>
    syncGroup.includes(feature),
  );
  if (!group) return [];
  return group.filter((syncFeature) => syncFeature !== feature);
};

export const normalizeSidebarWidthInput = (
  feature: string,
  value: unknown,
): number | null => {
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return null;
    return clampSidebarWidthForAnyFeature(feature, parsed);
  }

  const numeric = getNumeric(value);
  if (numeric === null) return null;
  return clampSidebarWidthForAnyFeature(feature, numeric);
};

const applyLegacyRightWidthMigration = (
  input: Record<string, unknown>,
  normalized: Record<string, number>,
): void => {
  const copyLegacyWidthIfMissing = (
    legacyKey: string,
    targetKeys: SidebarWidthFeature[],
  ) => {
    const legacyWidth = normalizeSidebarWidthInput(legacyKey, input[legacyKey]);
    if (legacyWidth === null) return;

    targetKeys.forEach((targetKey) => {
      if (normalizeSidebarWidthInput(targetKey, input[targetKey]) !== null) return;
      normalized[targetKey] = clampSidebarWidthForAnyFeature(targetKey, legacyWidth);
    });
  };

  copyLegacyWidthIfMissing("character", ["docsCharacter", "editorCharacter"]);
  copyLegacyWidthIfMissing("event", ["docsEvent"]);
  copyLegacyWidthIfMissing("faction", ["docsFaction"]);
  copyLegacyWidthIfMissing("world", ["docsWorld", "editorWorld"]);
  copyLegacyWidthIfMissing("scrap", ["docsScrap", "editorScrap"]);
  copyLegacyWidthIfMissing("analysis", ["docsAnalysis", "editorAnalysis"]);
  copyLegacyWidthIfMissing("snapshot", ["docsSnapshot", "editorSnapshot"]);
  copyLegacyWidthIfMissing("trash", ["docsTrash", "editorTrash"]);
  copyLegacyWidthIfMissing("editor", ["docsEditor"]);
  copyLegacyWidthIfMissing("export", ["docsExport"]);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeSidebarWidthsWithMigrations = (
  input: unknown,
): Record<string, number> => {
  const normalized: Record<string, number> = buildDefaultSidebarWidths();
  if (!isRecord(input)) {
    return normalized;
  }

  Object.entries(input).forEach(([key, rawValue]) => {
    const width = normalizeSidebarWidthInput(key, rawValue);
    if (width === null) return;
    normalized[key] = width;
  });

  const legacyBinder = normalizeSidebarWidthInput("binder", input.binder);
  if (legacyBinder !== null) {
    if (normalizeSidebarWidthInput("mainSidebar", input.mainSidebar) === null) {
      normalized.mainSidebar = clampSidebarWidthForAnyFeature("mainSidebar", legacyBinder);
    }
    if (normalizeSidebarWidthInput("docsBinder", input.docsBinder) === null) {
      normalized.docsBinder = clampSidebarWidthForAnyFeature("docsBinder", legacyBinder);
    }
    if (normalizeSidebarWidthInput("scrivenerBinder", input.scrivenerBinder) === null) {
      normalized.scrivenerBinder = clampSidebarWidthForAnyFeature("scrivenerBinder", legacyBinder);
    }
  }

  const legacyContext = normalizeSidebarWidthInput("context", input.context);
  if (legacyContext !== null && normalizeSidebarWidthInput("mainContext", input.mainContext) === null) {
    normalized.mainContext = clampSidebarWidthForAnyFeature("mainContext", legacyContext);
  }

  const legacyInspector = normalizeSidebarWidthInput("inspector", input.inspector);
  if (
    legacyInspector !== null &&
    normalizeSidebarWidthInput("scrivenerInspector", input.scrivenerInspector) === null
  ) {
    normalized.scrivenerInspector = clampSidebarWidthForAnyFeature("scrivenerInspector", legacyInspector);
  }

  applyLegacyRightWidthMigration(input, normalized);

  return normalized;
};

export const toPxSize = (value: number): string =>
  `${Math.max(0, Math.round(value))}px`;

export const toPercentSize = (value: number): string => {
  const normalized = Math.min(100, Math.max(0, value));
  return `${Number(normalized.toFixed(3))}%`;
};
