/**
 * 자료 화면의 새 상위 정보구조다.
 *
 * 기존 `ResearchTab`/`WorldTab`은 저장값과 단축키에 이미 기록되어 있으므로
 * 이 단계에서는 기존 타입을 제거하지 않고, 새 목적지와 레거시 화면의
 * 보존 규칙만 먼저 고정한다. 실제 라우팅 전환은 migration 단계에서 수행한다.
 */
export const RESEARCH_CATALOG_IDS = [
  "character",
  "event",
  "faction",
  "scrap",
  "plotboard",
  "untitled",
] as const;

export type ResearchCatalogId = (typeof RESEARCH_CATALOG_IDS)[number];

export const RESEARCH_CATALOG_ITEMS = [
  { id: "character", titleKey: "research.title.characters" },
  { id: "event", titleKey: "research.title.events" },
  { id: "faction", titleKey: "research.title.factions" },
  { id: "scrap", titleKey: "research.title.scrap" },
  { id: "plotboard", titleKey: "research.title.plotBoard" },
  { id: "untitled", titleKey: "research.title.untitled" },
] as const satisfies ReadonlyArray<{
  id: ResearchCatalogId;
  titleKey: string;
}>;

/** 새 상위 자료 안에서 유지할 기존 하위 기능의 이름이다. */
export const RESEARCH_CATALOG_SUBVIEWS = {
  scrap: ["terms", "memo"],
  plotboard: ["synopsis", "plot"],
  untitled: [],
} as const;

export type LegacyResearchTab =
  | "character"
  | "world"
  | "event"
  | "faction"
  | "scrap"
  | "analysis";

export type LegacyWorldTab =
  | "synopsis"
  | "terms"
  | "mindmap"
  | "drawing"
  | "plot"
  | "graph";

/**
 * `world`는 여러 새 자료로 분해되므로 단일 목적지로 자동 변환하지 않는다.
 * null을 유지하면 migration에서 worldTab을 확인하지 않고 데이터를 버리는
 * 실수를 컴파일 단계에서 피할 수 있다.
 */
export const LEGACY_RESEARCH_TAB_TARGETS = {
  character: "character",
  event: "event",
  faction: "faction",
  scrap: "scrap",
  analysis: "untitled",
  world: null,
} as const satisfies Record<LegacyResearchTab, ResearchCatalogId | null>;

/**
 * 기존 World 화면의 하위 기능을 새 자료의 부모로 옮긴다.
 * 하위 view 이름은 replica 문서와 단축키 migration에서 그대로 사용한다.
 */
export const LEGACY_WORLD_TAB_TARGETS = {
  terms: "scrap",
  synopsis: "plotboard",
  plot: "plotboard",
  mindmap: "untitled",
  drawing: "untitled",
  graph: "untitled",
} as const satisfies Record<LegacyWorldTab, ResearchCatalogId>;
