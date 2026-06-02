import type { ResearchTab, ScrivenerSectionsState } from "../uiStore";
import type { PersistedDocsRightTab } from "./types";

export const PERSISTABLE_DOCS_TABS = new Set<Exclude<PersistedDocsRightTab, null>>([
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
]);

export const WORKSPACE_PANEL_MIN_SIZE = 15;
export const WORKSPACE_PANEL_MAX_SIZE = 90;
