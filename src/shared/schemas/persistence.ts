import { z } from "zod";
import {
  PROJECT_LAYOUT_SCHEMA_VERSION,
  UI_STORE_SCHEMA_VERSION,
} from "../constants/storage/persistence";

// NOTE: PERSISTABLE_RESEARCH_TABS / PERSISTABLE_DOCS_TABS가 허용하는 값과 반드시 일치해야 한다.
// 좁으면 strictObject 검증이 실패해 project layout 전체 payload가 폐기된다.
const persistedResearchTabs = [
  "character",
  "world",
  "event",
  "faction",
  "scrap",
  "analysis",
  "plotboard",
  "untitled",
] as const;

const uiRightPanelTabSchema = z.enum([
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

const workspacePanelStateSchema = z.strictObject({
  panels: z.array(
    z.strictObject({
      id: z.string().min(1),
      content: z.strictObject({
        type: z.enum(["research", "editor", "export"]),
        id: z.string().optional(),
        tab: z.enum(persistedResearchTabs).optional(),
      }),
      size: z.number().finite(),
    }),
  ),
  researchPanelSizes: z
    .partialRecord(z.enum(persistedResearchTabs), z.number().finite())
    .optional(),
  // default 레이아웃은 research 탭이 패널 하나를 공유하므로 폭을 하나만 저장한다.
  researchPanelSize: z.number().finite().optional(),
  researchPanelWidthPx: z.number().finite().optional(),
  // 분할 editor 패널 폭. research와 같은 이유로 px로 저장한다.
  editorPanelWidthPx: z.number().finite().optional(),
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
  editor: z
    .strictObject({
      sidebarOpen: z.boolean().optional(),
      binderRailOpen: z.boolean().optional(),
      rightTab: uiRightPanelTabSchema.nullable().optional(),
      activeChapterId: z.string().nullable(),
      scrollYByChapter: z.record(z.string(), z.number()),
    })
    .optional(),
  workspace: workspacePanelStateSchema
    .extend({
      byLayout: z
        .strictObject({
          default: workspacePanelStateSchema.optional(),
        })
        .optional(),
    })
    .optional(),
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
