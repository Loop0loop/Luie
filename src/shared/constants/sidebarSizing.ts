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

const RIGHT_CONTEXT_WIDTH_CONFIG: SidebarWidthConfig = {
  minPx: 320,
  maxPx: 560,
  defaultPx: 420,
};

const RESEARCH_LEFT_WIDTH_CONFIG: SidebarWidthConfig = {
  minPx: 145,
  maxPx: 420,
  defaultPx: 210,
};

export const SIDEBAR_WIDTH_CONFIG: Record<SidebarWidthFeature, SidebarWidthConfig> = {
  mainSidebar: { minPx: 210, maxPx: 330, defaultPx: 280 },
  mainContext: { minPx: 310, maxPx: 610, defaultPx: 310 },
  docsBinder: { minPx: 300, maxPx: 610, defaultPx: 360 },
  scrivenerBinder: { minPx: 220, maxPx: 610, defaultPx: 260 },
  scrivenerInspector: { minPx: 245, maxPx: 610, defaultPx: 350 },
  docsCharacter: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsEvent: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsFaction: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsWorld: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsScrap: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsAnalysis: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsSnapshot: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsTrash: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsEditor: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  docsExport: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  editorCharacter: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  editorWorld: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  editorScrap: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  editorAnalysis: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  editorSnapshot: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  editorTrash: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  // Legacy shared right-panel keys (read only for migration)
  character: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  event: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  faction: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  world: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  scrap: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  analysis: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  snapshot: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  trash: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  memo: { minPx: 240, maxPx: 620, defaultPx: 350 },
  editor: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  export: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  characterSidebar: { ...RESEARCH_LEFT_WIDTH_CONFIG },
  eventSidebar: { ...RESEARCH_LEFT_WIDTH_CONFIG },
  factionSidebar: { ...RESEARCH_LEFT_WIDTH_CONFIG },
  memoSidebar: { minPx: 220, maxPx: 560, defaultPx: 320 },
  worldGraphSidebar: { minPx: 220, maxPx: 640, defaultPx: 320 },
  worldGraphInspector: { ...RIGHT_CONTEXT_WIDTH_CONFIG },
  binder: { minPx: 220, maxPx: 630, defaultPx: 280 },
  context: { minPx: 240, maxPx: 610, defaultPx: 310 },
  inspector: { minPx: 245, maxPx: 460, defaultPx: 350 },
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
