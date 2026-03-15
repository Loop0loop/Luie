import type {
  EntityRelation,
  GraphPluginCatalogItem,
  GraphPluginTemplateRef,
  InstalledGraphPlugin,
  ScrapMemo,
  WorldEntitySourceType,
  WorldEntityType,
  WorldGraphNode,
} from "@shared/types";

export type GraphSurfaceTab =
  | "canvas"
  | "timeline"
  | "notes"
  | "entity"
  | "library";

export type GraphCreatePreset = {
  entityType: WorldEntitySourceType;
  subType?: WorldEntityType;
  label: string;
};

export type GraphWorkspaceData = {
  currentProjectId: string | null;
  currentProjectTitle: string;
  graphNodes: WorldGraphNode[];
  graphEdges: EntityRelation[];
  timelineNodes: WorldGraphNode[];
  notes: ScrapMemo[];
  notesLoading: boolean;
  notesSaving: boolean;
  graphLoading: boolean;
  graphError: string | null;
  pluginsLoading: boolean;
  pluginError: string | null;
  catalog: GraphPluginCatalogItem[];
  installed: InstalledGraphPlugin[];
  templates: GraphPluginTemplateRef[];
};
