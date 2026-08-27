import type { ResearchTab, ScrivenerSectionsState } from "../uiStore";
import type { PersistedDocsRightTab } from "./types";

export const PERSISTABLE_DOCS_TABS = new Set<
  Exclude<PersistedDocsRightTab, null>
>([
  "character",
  "event",
  "faction",
  "world",
  "scrap",
  "plotboard",
  "untitled",
  "analysis",
  "snapshot",
  "trash",
  "editor",
  "export",
]);

export const DEFAULT_SCRIVENER_SECTIONS: ScrivenerSectionsState = {
  manuscript: true,
  characters: true,
  events: false,
  factions: false,
  world: false,
  scrap: false,
  snapshots: false,
  analysis: false,
  trash: false,
};

export const PERSISTABLE_RESEARCH_TABS = new Set<ResearchTab>([
  "character",
  "world",
  "event",
  "faction",
  "scrap",
  "analysis",
  "plotboard",
  "untitled",
]);

export const WORKSPACE_PANEL_MIN_SIZE = 15;
export const WORKSPACE_PANEL_MAX_SIZE = 90;

// NOTE: research 패널은 원고 패널과 group을 공유한다. 저장값이 없을 때 uiStore의 균등분할
// (100/panels.length)에 맡기면 패널 하나일 때 100%가 잡혀 원고가 minSize까지 밀린다.
// docs 레이아웃의 research 패널 기본 비율과 같은 값을 명시적으로 쓴다.
export const DEFAULT_RESEARCH_PANEL_SIZE = 40;
