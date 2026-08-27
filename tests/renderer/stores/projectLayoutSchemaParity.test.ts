import { describe, expect, it } from "vitest";
import { projectLayoutPersistedStateSchema } from "../../../src/shared/schemas/index.js";
import {
  PERSISTABLE_DOCS_TABS,
  PERSISTABLE_RESEARCH_TABS,
} from "../../../src/renderer/src/features/workspace/stores/projectLayout/constants.js";

// projectLayoutPersistedStateSchema는 strictObject라서 런타임 sanitizer가 허용하는 값을
// 하나라도 거부하면 project layout payload 전체가 폐기되고 저장된 크기가 사라진다.
// 두 목록이 갈라지는 순간을 여기서 잡는다.

const buildPayload = (overrides: {
  docsRightTab?: string | null;
  editorRightTab?: string | null;
  researchTab?: string;
}) => ({
  schemaVersion: 1,
  byProject: {
    "project-1": {
      main: { sidebarOpen: true, contextOpen: true },
      docs: {
        sidebarOpen: true,
        binderBarOpen: true,
        rightTab: overrides.docsRightTab ?? null,
      },
      scrivener: {
        sidebarOpen: true,
        inspectorOpen: true,
        sections: {
          manuscript: true,
          characters: true,
          events: false,
          factions: false,
          world: false,
          scrap: false,
          snapshots: false,
          analysis: false,
          trash: false,
        },
      },
      editor: {
        rightTab: overrides.editorRightTab ?? null,
        activeChapterId: null,
        scrollYByChapter: {},
      },
      workspace: {
        panels: overrides.researchTab
          ? [
              {
                id: `research-${overrides.researchTab}`,
                content: { type: "research", tab: overrides.researchTab },
                size: 40,
              },
            ]
          : [],
        researchPanelSizes: overrides.researchTab
          ? { [overrides.researchTab]: 40 }
          : {},
      },
      sidebarWidths: {},
      layoutSurfaceRatios: { "default.sidebar": 30, "default.panel": 38 },
    },
  },
});

describe("project layout persist schema parity", () => {
  it("accepts every research tab the runtime persists", () => {
    for (const tab of PERSISTABLE_RESEARCH_TABS) {
      const result = projectLayoutPersistedStateSchema.safeParse(
        buildPayload({ researchTab: tab }),
      );
      expect(result.success, `researchPanelSizes rejected "${tab}"`).toBe(true);
    }
  });

  it("accepts every docs right-panel tab the runtime persists", () => {
    for (const tab of PERSISTABLE_DOCS_TABS) {
      const docsResult = projectLayoutPersistedStateSchema.safeParse(
        buildPayload({ docsRightTab: tab }),
      );
      expect(docsResult.success, `docs.rightTab rejected "${tab}"`).toBe(true);

      const editorResult = projectLayoutPersistedStateSchema.safeParse(
        buildPayload({ editorRightTab: tab }),
      );
      expect(editorResult.success, `editor.rightTab rejected "${tab}"`).toBe(
        true,
      );
    }
  });
});
