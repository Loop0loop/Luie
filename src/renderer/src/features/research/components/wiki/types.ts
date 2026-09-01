export type CharacterViewMode = "wiki" | "document";

export type RadarAxis = {
  label: string;
  value: number;
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

export const CHARACTER_VIEW_MODE_KEY = "character-view-mode" as const;

/** 프로필 요약(Infobox) 열림 상태 저장 키. viewMode와 슬롯이 겹치지 않게 분리한다. */
export const CHARACTER_INFOBOX_KEY = "character-infobox" as const;

// NOTE: dark theme의 CSS `--accent`와 같은 fallback 색상을 사용한다.
export const DEFAULT_CHARACTER_COLOR = "#60a5fa" as const;

// NOTE: 선택한 색은 design token이 아니라 사용자 데이터인 hex 값으로 저장된다.
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
