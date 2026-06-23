import { z } from "zod";
import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  UI_STORE_SCHEMA_VERSION,
} from "../constants/storage/persistence";

const uiRightPanelTabSchema = z.enum([
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
  "canvas",
]);

const uiMainViewSchema = z.strictObject({
  type: z.enum([
    "editor",
    "character",
    "event",
    "faction",
    "world",
    "memo",
    "trash",
    "analysis",
    "canvas",
  ]),
  id: z.string().optional(),
});

const uiScrivenerSectionsSchema = z.strictObject({
  manuscript: z.boolean(),
  characters: z.boolean(),
  events: z.boolean(),
  factions: z.boolean(),
  world: z.boolean(),
  scrap: z.boolean(),
  snapshots: z.boolean(),
  analysis: z.boolean(),
  trash: z.boolean(),
});

const uiRegionsSchema = z.strictObject({
  leftSidebar: z.strictObject({
    open: z.boolean(),
    widthPx: z.number().finite(),
  }),
  rightPanel: z.strictObject({
    open: z.boolean(),
    activeTab: uiRightPanelTabSchema.nullable(),
    widthByTab: z.record(z.string(), z.number().finite()),
  }),
  rightRail: z.strictObject({
    open: z.boolean(),
  }),
});

export const uiStorePersistedStateSchema = z.strictObject({
  schemaVersion: z
    .number()
    .int()
    .positive()
    .max(UI_STORE_SCHEMA_VERSION)
    .optional(),
  view: z.enum(["template", "editor", "corkboard", "outliner"]).optional(),
  contextTab: z.enum(["synopsis", "characters", "terms"]).optional(),
  worldTab: z
    .enum(["synopsis", "terms", "mindmap", "drawing", "plot", "graph"])
    .optional(),
  isSidebarOpen: z.boolean().optional(),
  isContextOpen: z.boolean().optional(),
  isManuscriptMenuOpen: z.boolean().optional(),
  isBinderBarOpen: z.boolean().optional(),
  scrivenerSidebarOpen: z.boolean().optional(),
  scrivenerInspectorOpen: z.boolean().optional(),
  scrivenerSections: uiScrivenerSectionsSchema.optional(),
  sidebarWidths: z.record(z.string(), z.number().finite()).optional(),
  layoutSurfaceRatios: z.record(z.string(), z.number().finite()).optional(),
  regions: uiRegionsSchema.optional(),
  docsRightTab: uiRightPanelTabSchema.nullable().optional(),
  mainView: uiMainViewSchema.optional(),
});

const projectLayoutStateSchema = z.strictObject({
  main: z.strictObject({
    sidebarOpen: z.boolean(),
    contextOpen: z.boolean(),
  }),
  docs: z.strictObject({
    sidebarOpen: z.boolean(),
    binderBarOpen: z.boolean(),
    rightTab: uiRightPanelTabSchema.nullable(),
  }),
  scrivener: z.strictObject({
    sidebarOpen: z.boolean(),
    inspectorOpen: z.boolean(),
    sections: uiScrivenerSectionsSchema,
  }),
  editor: z.strictObject({
    sidebarOpen: z.boolean().optional(),
    binderRailOpen: z.boolean().optional(),
    rightTab: uiRightPanelTabSchema.nullable().optional(),
    activeChapterId: z.string().nullable(),
    scrollYByChapter: z.record(z.string(), z.number()),
  }).optional(),
  workspace: z.strictObject({
    panels: z.array(
      z.strictObject({
        id: z.string().min(1),
        content: z.strictObject({
          type: z.enum(["research", "editor", "export"]),
          id: z.string().optional(),
          tab: z
            .enum(["character", "world", "event", "faction", "scrap", "analysis"])
            .optional(),
        }),
        size: z.number().finite(),
      }),
    ),
    researchPanelSizes: z
      .partialRecord(
        z.enum(["character", "world", "event", "faction", "scrap", "analysis"]),
        z.number().finite(),
      )
      .optional(),
  }).optional(),
  sidebarWidths: z.record(z.string(), z.number().finite()).optional(),
  layoutSurfaceRatios: z.record(z.string(), z.number().finite()).optional(),
});

export const projectLayoutPersistedStateSchema = z.strictObject({
  schemaVersion: z
    .number()
    .int()
    .positive()
    .max(PROJECT_LAYOUT_SCHEMA_VERSION)
    .optional(),
  byProject: z.record(z.string(), projectLayoutStateSchema),
});
export type UiStorePersistedState = z.infer<typeof uiStorePersistedStateSchema>;
export type ProjectLayoutPersistedState = z.infer<
  typeof projectLayoutPersistedStateSchema
>;

// ─── World Building Schemas ─────────────────────────────────────────────────
