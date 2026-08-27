import { normalizeSidebarWidthInput } from "./sidebarSizing";
import {
  CANVAS_ACTIVITY_LAYOUT_CONFIG,
  CANVAS_BINDER_LAYOUT_CONFIG,
} from "./canvasSizing";

export const SPLIT_PANEL_MIN_SIZE_PERCENT = 15;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toRoundedPercent = (value: number): number =>
  Number(clampNumber(value, 0, 100).toFixed(3));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const DEFAULT_LAYOUT_PANEL_SURFACE_MAP = {
  context: "default.panel",
} as const;

export const DOCS_LAYOUT_PANEL_SURFACE_MAP = {
  character: "docs.panel.character",
  event: "docs.panel.event",
  faction: "docs.panel.faction",
  world: "docs.panel.world",
  scrap: "docs.panel.scrap",
  plotboard: "docs.panel.plotboard",
  untitled: "docs.panel.untitled",
  analysis: "docs.panel.analysis",
  snapshot: "docs.panel.snapshot",
  trash: "docs.panel.trash",
  editor: "docs.panel.editor",
  export: "docs.panel.export",
} as const;

export const EDITOR_LAYOUT_PANEL_SURFACE_MAP = {
  character: "editor.panel.character",
  event: "editor.panel.event",
  faction: "editor.panel.faction",
  world: "editor.panel.world",
  scrap: "editor.panel.scrap",
  analysis: "editor.panel.analysis",
  snapshot: "editor.panel.snapshot",
  trash: "editor.panel.trash",
  canvas: "editor.panel.canvas",
} as const;

export type DefaultLayoutPanelSurfaceKey =
  keyof typeof DEFAULT_LAYOUT_PANEL_SURFACE_MAP;
export type DocsLayoutPanelTab = keyof typeof DOCS_LAYOUT_PANEL_SURFACE_MAP;
export type EditorLayoutPanelTab = keyof typeof EDITOR_LAYOUT_PANEL_SURFACE_MAP;

export type LayoutSurfaceId =
  | "default.sidebar"
  | "default.panel"
  | "docs.sidebar"
  | (typeof DOCS_LAYOUT_PANEL_SURFACE_MAP)[DocsLayoutPanelTab]
  | "scrivener.binder"
  | "scrivener.inspector"
  | (typeof EDITOR_LAYOUT_PANEL_SURFACE_MAP)[EditorLayoutPanelTab]
  | "canvas.activity"
  | "canvas.binder";

export type LayoutSurfaceRole = "sidebar" | "panel" | "binder" | "inspector";

export type LayoutSurfaceConfig = {
  role: LayoutSurfaceRole;
  defaultRatio: number;
  minPx: number;
  maxPx: number;
};

const DEFAULT_SIDEBAR_CONFIG: LayoutSurfaceConfig = {
  role: "sidebar",
  defaultRatio: 18,
  minPx: 220,
  maxPx: 420,
};

const DEFAULT_PANEL_CONFIG: LayoutSurfaceConfig = {
  role: "panel",
  defaultRatio: 28,
  minPx: 320,
  maxPx: 760,
};

const NESTED_MANAGER_PANEL_CONFIG: LayoutSurfaceConfig = {
  role: "panel",
  defaultRatio: 36,
  minPx: 370,
  maxPx: 560,
};

// NOTE: Google Docs 레이아웃 전용 panel 크기. 사용자가 resize 로 panel 을 닫으려 해도
// minPx 가 하드 플로어로 작용해 더 줄어들지 않는다(research/AI/버전기록 컨텐츠 가독성+열림 상태 일관성 유지).
const DOCS_RESEARCH_PANEL_CONFIG: LayoutSurfaceConfig = {
  role: "panel",
  defaultRatio: 40,
  minPx: 420,
  maxPx: 780,
};

const DOCS_AI_PANEL_CONFIG: LayoutSurfaceConfig = {
  role: "panel",
  defaultRatio: 44,
  minPx: 480,
  maxPx: 900,
};

const DOCS_SNAPSHOT_PANEL_CONFIG: LayoutSurfaceConfig = {
  role: "panel",
  defaultRatio: 30,
  minPx: 380,
  maxPx: 860,
};

const DEFAULT_BINDER_CONFIG: LayoutSurfaceConfig = {
  role: "binder",
  defaultRatio: 19,
  minPx: 220,
  maxPx: 420,
};

const DEFAULT_INSPECTOR_CONFIG: LayoutSurfaceConfig = {
  role: "inspector",
  defaultRatio: 26,
  minPx: 300,
  maxPx: 760,
};

export const LAYOUT_SURFACE_CONFIG: Record<
  LayoutSurfaceId,
  LayoutSurfaceConfig
> = {
  "default.sidebar": { ...DEFAULT_SIDEBAR_CONFIG },
  "default.panel": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 24 },
  "docs.sidebar": { ...DEFAULT_SIDEBAR_CONFIG, defaultRatio: 17 },
  "docs.panel.character": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.event": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.faction": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.world": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.scrap": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.plotboard": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.untitled": { ...DOCS_RESEARCH_PANEL_CONFIG },
  "docs.panel.analysis": { ...DOCS_AI_PANEL_CONFIG },
  "docs.panel.snapshot": { ...DOCS_SNAPSHOT_PANEL_CONFIG },
  "docs.panel.trash": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "docs.panel.editor": { ...DOCS_RESEARCH_PANEL_CONFIG, defaultRatio: 34 },
  "docs.panel.export": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 30 },
  "editor.panel.character": {
    ...NESTED_MANAGER_PANEL_CONFIG,
    defaultRatio: 38,
  },
  "editor.panel.event": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.faction": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.world": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.scrap": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.analysis": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.snapshot": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "editor.panel.trash": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "editor.panel.canvas": { ...DEFAULT_INSPECTOR_CONFIG, defaultRatio: 26 },
  "scrivener.binder": { ...DEFAULT_BINDER_CONFIG },
  "scrivener.inspector": { ...DEFAULT_INSPECTOR_CONFIG },
  "canvas.activity": { ...CANVAS_ACTIVITY_LAYOUT_CONFIG },
  "canvas.binder": { ...CANVAS_BINDER_LAYOUT_CONFIG },
};

const LEGACY_WIDTH_KEYS_BY_LAYOUT_SURFACE: Record<LayoutSurfaceId, string[]> = {
  "default.sidebar": ["mainSidebar"],
  "default.panel": ["mainContext"],
  "docs.sidebar": ["docsBinder"],
  "docs.panel.character": ["docsCharacter", "character"],
  "docs.panel.event": ["docsEvent", "event"],
  "docs.panel.faction": ["docsFaction", "faction"],
  "docs.panel.world": ["docsWorld", "world"],
  "docs.panel.scrap": ["docsScrap", "scrap"],
  "docs.panel.plotboard": ["docsPlotboard", "plotboard"],
  "docs.panel.untitled": ["docsUntitled", "untitled"],
  "docs.panel.analysis": ["docsAnalysis", "analysis"],
  "docs.panel.snapshot": ["docsSnapshot", "snapshot"],
  "docs.panel.trash": ["docsTrash", "trash"],
  "docs.panel.editor": ["docsEditor", "editor"],
  "docs.panel.export": ["docsExport", "export"],
  "editor.panel.character": ["editorCharacter", "character"],
  "editor.panel.event": ["editorEvent", "event"],
  "editor.panel.faction": ["editorFaction", "faction"],
  "editor.panel.world": ["editorWorld", "world"],
  "editor.panel.scrap": ["editorScrap", "scrap"],
  "editor.panel.analysis": ["editorAnalysis", "analysis"],
  "editor.panel.snapshot": ["editorSnapshot", "snapshot"],
  "editor.panel.trash": ["editorTrash", "trash"],
  "editor.panel.canvas": ["editorCanvas"],
  "scrivener.binder": ["scrivenerBinder"],
  "scrivener.inspector": ["scrivenerInspector"],
  "canvas.activity": ["canvasActivity"],
  "canvas.binder": ["canvasBinder"],
};

const getViewportWidth = (): number =>
  typeof window !== "undefined" &&
  Number.isFinite(window.innerWidth) &&
  window.innerWidth > 0
    ? window.innerWidth
    : 1440;

const getResponsiveReferenceWidth = (containerWidthPx: number): number =>
  Number.isFinite(containerWidthPx) && containerWidthPx > 0
    ? containerWidthPx
    : getViewportWidth();

export const isLayoutSurfaceId = (value: string): value is LayoutSurfaceId =>
  Object.prototype.hasOwnProperty.call(LAYOUT_SURFACE_CONFIG, value);

export const getLayoutSurfaceConfig = (
  surface: LayoutSurfaceId,
): LayoutSurfaceConfig => LAYOUT_SURFACE_CONFIG[surface];

export const getLayoutSurfaceDefaultRatio = (
  surface: LayoutSurfaceId,
): number => LAYOUT_SURFACE_CONFIG[surface].defaultRatio;

export const clampLayoutSurfaceRatio = (
  _surface: LayoutSurfaceId,
  ratio: number,
): number => toRoundedPercent(ratio);

export const normalizeLayoutSurfaceRatioInput = (
  surface: LayoutSurfaceId,
  value: unknown,
): number | null => {
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/%$/, "");
    const parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) return null;
    return clampLayoutSurfaceRatio(surface, parsed);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return clampLayoutSurfaceRatio(surface, value);
};

export const buildDefaultLayoutSurfaceRatios = (): Record<
  LayoutSurfaceId,
  number
> =>
  Object.fromEntries(
    (Object.keys(LAYOUT_SURFACE_CONFIG) as LayoutSurfaceId[]).map((surface) => [
      surface,
      getLayoutSurfaceDefaultRatio(surface),
    ]),
  ) as Record<LayoutSurfaceId, number>;

const deriveLegacyLayoutSurfaceRatio = (
  surface: LayoutSurfaceId,
  legacySidebarWidths: unknown,
): number | null => {
  if (!isRecord(legacySidebarWidths)) return null;

  for (const legacyKey of LEGACY_WIDTH_KEYS_BY_LAYOUT_SURFACE[surface]) {
    const widthPx = normalizeSidebarWidthInput(
      legacyKey,
      legacySidebarWidths[legacyKey],
    );
    if (widthPx === null) continue;
    return clampLayoutSurfaceRatio(
      surface,
      (widthPx / getViewportWidth()) * 100,
    );
  }

  return null;
};

export const normalizeLayoutSurfaceRatiosWithMigrations = (
  input: unknown,
  legacySidebarWidths?: unknown,
): Record<LayoutSurfaceId, number> => {
  const normalized = buildDefaultLayoutSurfaceRatios();
  const explicitInput = isRecord(input) ? input : null;

  for (const surface of Object.keys(
    LAYOUT_SURFACE_CONFIG,
  ) as LayoutSurfaceId[]) {
    const explicitRatio = explicitInput
      ? normalizeLayoutSurfaceRatioInput(surface, explicitInput[surface])
      : null;
    if (explicitRatio !== null) {
      normalized[surface] = explicitRatio;
      continue;
    }

    const legacyRatio = deriveLegacyLayoutSurfaceRatio(
      surface,
      legacySidebarWidths,
    );
    if (legacyRatio !== null) {
      normalized[surface] = legacyRatio;
    }
  }

  return normalized;
};

export const getDocsLayoutPanelSurface = (
  tab: DocsLayoutPanelTab,
): LayoutSurfaceId => DOCS_LAYOUT_PANEL_SURFACE_MAP[tab];

export const getEditorLayoutPanelSurface = (
  tab: EditorLayoutPanelTab,
): LayoutSurfaceId => EDITOR_LAYOUT_PANEL_SURFACE_MAP[tab];

export const toPanelPercentSize = (value: number): string =>
  `${clampLayoutSurfaceRatio("default.panel", value)}%`;

export const toPanelPercentSizeFromPixels = (
  containerWidthPx: number,
  valuePx: number,
): string =>
  `${Number(
    clampNumber(
      (valuePx / getResponsiveReferenceWidth(containerWidthPx)) * 100,
      0,
      100,
    ).toFixed(3),
  )}%`;

export type ResponsivePanelSize = {
  minSize: string;
  maxSize: string;
};

export const getResponsivePanelSize = (
  containerWidthPx: number,
  config: Pick<LayoutSurfaceConfig, "minPx" | "maxPx">,
): ResponsivePanelSize => ({
  minSize: toPanelPercentSizeFromPixels(containerWidthPx, config.minPx),
  maxSize: toPanelPercentSizeFromPixels(containerWidthPx, config.maxPx),
});

export const toPanelPixelSize = (value: number): string =>
  `${Math.max(0, Math.round(value))}px`;

export const COMPACT_BINDER_RAIL_WIDTH_PX = 44;
export const COMPACT_BINDER_MIN_WIDTH_PX = 260;
export const COMPACT_BINDER_MAX_WIDTH_PX = 720;
export const COMPACT_BINDER_SNAPSHOT_VIEWER_WIDTH_PX = 480;

export const CANVAS_ICON_RAIL_WIDTH_PX = 44;
export const CANVAS_TOOLBAR_HEIGHT_PX = 36;
export const CANVAS_STATUS_BAR_HEIGHT_PX = 28;
