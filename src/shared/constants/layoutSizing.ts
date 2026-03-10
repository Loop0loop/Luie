import { normalizeSidebarWidthInput } from "./sidebarSizing";

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
  analysis: "docs.panel.analysis",
  snapshot: "docs.panel.snapshot",
  trash: "docs.panel.trash",
  editor: "docs.panel.editor",
  export: "docs.panel.export",
} as const;

export const EDITOR_LAYOUT_PANEL_SURFACE_MAP = {
  character: "editor.panel.character",
  world: "editor.panel.world",
  scrap: "editor.panel.scrap",
  analysis: "editor.panel.analysis",
  snapshot: "editor.panel.snapshot",
  trash: "editor.panel.trash",
} as const;

export type DefaultLayoutPanelSurfaceKey = keyof typeof DEFAULT_LAYOUT_PANEL_SURFACE_MAP;
export type DocsLayoutPanelTab = keyof typeof DOCS_LAYOUT_PANEL_SURFACE_MAP;
export type EditorLayoutPanelTab = keyof typeof EDITOR_LAYOUT_PANEL_SURFACE_MAP;

export type LayoutSurfaceId =
  | "default.sidebar"
  | "default.panel"
  | "docs.sidebar"
  | (typeof DOCS_LAYOUT_PANEL_SURFACE_MAP)[DocsLayoutPanelTab]
  | "scrivener.binder"
  | "scrivener.inspector"
  | (typeof EDITOR_LAYOUT_PANEL_SURFACE_MAP)[EditorLayoutPanelTab];

export type LayoutSurfaceRole =
  | "sidebar"
  | "panel"
  | "binder"
  | "inspector";

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
  minPx: 420,
  maxPx: 960,
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

export const LAYOUT_SURFACE_CONFIG: Record<LayoutSurfaceId, LayoutSurfaceConfig> = {
  "default.sidebar": { ...DEFAULT_SIDEBAR_CONFIG },
  "default.panel": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 24 },
  "docs.sidebar": { ...DEFAULT_SIDEBAR_CONFIG, defaultRatio: 17 },
  "docs.panel.character": { ...NESTED_MANAGER_PANEL_CONFIG },
  "docs.panel.event": { ...NESTED_MANAGER_PANEL_CONFIG },
  "docs.panel.faction": { ...NESTED_MANAGER_PANEL_CONFIG },
  "docs.panel.world": { ...NESTED_MANAGER_PANEL_CONFIG },
  "docs.panel.scrap": { ...NESTED_MANAGER_PANEL_CONFIG },
  "docs.panel.analysis": { ...NESTED_MANAGER_PANEL_CONFIG },
  "docs.panel.snapshot": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "docs.panel.trash": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "docs.panel.editor": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 34 },
  "docs.panel.export": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 30 },
  "editor.panel.character": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.world": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.scrap": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.analysis": { ...NESTED_MANAGER_PANEL_CONFIG, defaultRatio: 38 },
  "editor.panel.snapshot": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "editor.panel.trash": { ...DEFAULT_PANEL_CONFIG, defaultRatio: 26 },
  "scrivener.binder": { ...DEFAULT_BINDER_CONFIG },
  "scrivener.inspector": { ...DEFAULT_INSPECTOR_CONFIG },
};

const LEGACY_WIDTH_KEYS_BY_LAYOUT_SURFACE: Record<LayoutSurfaceId, string[]> = {
  "default.sidebar": ["mainSidebar", "binder"],
  "default.panel": ["mainContext", "context"],
  "docs.sidebar": ["docsBinder", "binder"],
  "docs.panel.character": ["docsCharacter", "character"],
  "docs.panel.event": ["docsEvent", "event"],
  "docs.panel.faction": ["docsFaction", "faction"],
  "docs.panel.world": ["docsWorld", "world"],
  "docs.panel.scrap": ["docsScrap", "scrap"],
  "docs.panel.analysis": ["docsAnalysis", "analysis"],
  "docs.panel.snapshot": ["docsSnapshot", "snapshot"],
  "docs.panel.trash": ["docsTrash", "trash"],
  "docs.panel.editor": ["docsEditor", "editor"],
  "docs.panel.export": ["docsExport", "export"],
  "editor.panel.character": ["editorCharacter", "character"],
  "editor.panel.world": ["editorWorld", "world"],
  "editor.panel.scrap": ["editorScrap", "scrap"],
  "editor.panel.analysis": ["editorAnalysis", "analysis"],
  "editor.panel.snapshot": ["editorSnapshot", "snapshot"],
  "editor.panel.trash": ["editorTrash", "trash"],
  "scrivener.binder": ["scrivenerBinder", "binder"],
  "scrivener.inspector": ["scrivenerInspector", "inspector"],
};

const getViewportWidth = (): number =>
  typeof window !== "undefined" && Number.isFinite(window.innerWidth) && window.innerWidth > 0
    ? window.innerWidth
    : 1440;

export const isLayoutSurfaceId = (value: string): value is LayoutSurfaceId =>
  value in LAYOUT_SURFACE_CONFIG;

export const getLayoutSurfaceConfig = (surface: LayoutSurfaceId): LayoutSurfaceConfig =>
  LAYOUT_SURFACE_CONFIG[surface];

export const getLayoutSurfaceDefaultRatio = (surface: LayoutSurfaceId): number =>
  LAYOUT_SURFACE_CONFIG[surface].defaultRatio;

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

export const buildDefaultLayoutSurfaceRatios = (): Record<LayoutSurfaceId, number> =>
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
    const widthPx = normalizeSidebarWidthInput(legacyKey, legacySidebarWidths[legacyKey]);
    if (widthPx === null) continue;
    return clampLayoutSurfaceRatio(surface, (widthPx / getViewportWidth()) * 100);
  }

  return null;
};

export const normalizeLayoutSurfaceRatiosWithMigrations = (
  input: unknown,
  legacySidebarWidths?: unknown,
): Record<LayoutSurfaceId, number> => {
  const normalized = buildDefaultLayoutSurfaceRatios();
  const explicitInput = isRecord(input) ? input : null;

  for (const surface of Object.keys(LAYOUT_SURFACE_CONFIG) as LayoutSurfaceId[]) {
    const explicitRatio = explicitInput
      ? normalizeLayoutSurfaceRatioInput(surface, explicitInput[surface])
      : null;
    if (explicitRatio !== null) {
      normalized[surface] = explicitRatio;
      continue;
    }

    const legacyRatio = deriveLegacyLayoutSurfaceRatio(surface, legacySidebarWidths);
    if (legacyRatio !== null) {
      normalized[surface] = legacyRatio;
    }
  }

  return normalized;
};

export const getDocsLayoutPanelSurface = (tab: DocsLayoutPanelTab): LayoutSurfaceId =>
  DOCS_LAYOUT_PANEL_SURFACE_MAP[tab];

export const getEditorLayoutPanelSurface = (tab: EditorLayoutPanelTab): LayoutSurfaceId =>
  EDITOR_LAYOUT_PANEL_SURFACE_MAP[tab];

export const toPanelPercentSize = (value: number): string =>
  `${clampLayoutSurfaceRatio("default.panel", value)}%`;

export const toPanelPixelSize = (value: number): string =>
  `${Math.max(0, Math.round(value))}px`;
