/**
 * Types and constants for the character wiki feature.
 * Single source of truth — imported by all wiki sub-modules.
 */

// ── Domain types ──────────────────────────────────────────────────────────

export type CharacterViewMode = "wiki" | "visual";

export type RadarAxis = {
  label: string;
  value: number; // 0–MAX_RADAR_VALUE
};

export type WikiSectionData = {
  id: string;
  label: string;
};

export type CustomField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "select";
  options?: string[];
  placeholder?: string;
};

// ── Persistence keys ──────────────────────────────────────────────────────

export const CHARACTER_VIEW_MODE_KEY = "character-view-mode" as const;

// ── Color ─────────────────────────────────────────────────────────────────

/** Fallback accent colour (mirrors CSS --accent in dark theme) */
export const DEFAULT_CHARACTER_COLOR = "#60a5fa" as const;

/**
 * Preset palette shown in the colour picker.
 * Stored as user data (hex), not design tokens.
 */
export const CHARACTER_COLOR_PRESETS = [
  "#60a5fa",
  "#f472b6",
  "#a78bfa",
  "#34d399",
  "#fb923c",
  "#f87171",
  "#facc15",
  "#94a3b8",
] as const;

// ── Radar chart ───────────────────────────────────────────────────────────

export const MIN_RADAR_AXES = 3;
export const MAX_RADAR_AXES = 8;
export const MAX_RADAR_VALUE = 10;
export const RADAR_GRID_LEVELS = [2, 4, 6, 8, 10] as const;

export const DEFAULT_RADAR_AXES: RadarAxis[] = [
  { label: "의지", value: 5 },
  { label: "감성", value: 5 },
  { label: "지성", value: 5 },
  { label: "용기", value: 5 },
  { label: "카리스마", value: 5 },
  { label: "어두운 면", value: 5 },
];
