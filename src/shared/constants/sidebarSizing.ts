export type SidebarWidthFeature =
  | "mainSidebar"
  | "mainContext"
  | "docsBinder"
  | "scrivenerBinder"
  | "scrivenerInspector"
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
  maxPx: 1400,
  defaultPx: 900,
};

const RESEARCH_LEFT_WIDTH_CONFIG: SidebarWidthConfig = {
  minPx: 145,
  maxPx: 530,
  defaultPx: 210,
};

export const SIDEBAR_WIDTH_CONFIG: Record<SidebarWidthFeature, SidebarWidthConfig> = {
  mainSidebar: { minPx: 210, maxPx: 630, defaultPx: 280 },
  mainContext: { minPx: 310, maxPx: 610, defaultPx: 310 },
  docsBinder: { minPx: 300, maxPx: 520, defaultPx: 360 },
  scrivenerBinder: { minPx: 220, maxPx: 440, defaultPx: 260 },
  scrivenerInspector: { minPx: 245, maxPx: 400, defaultPx: 350 },
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

export const toPxSize = (value: number): string =>
  `${Math.max(0, Math.round(value))}px`;

export const toPercentSize = (value: number): string => {
  const normalized = Math.min(100, Math.max(0, value));
  return `${Number(normalized.toFixed(3))}%`;
};
