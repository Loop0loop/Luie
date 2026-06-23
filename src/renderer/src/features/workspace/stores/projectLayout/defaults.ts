import {
  buildDefaultLayoutSurfaceRatios,
} from "@renderer/shared/constants/layoutSizing";
import { buildDefaultSidebarWidths } from "@renderer/shared/constants/sidebarSizing";
import { DEFAULT_SCRIVENER_SECTIONS } from "./constants";
import type { ProjectLayoutState } from "./types";

export const createDefaultProjectLayoutState = (): ProjectLayoutState => ({
  main: {
    sidebarOpen: true,
    contextOpen: true,
  },
  docs: {
    sidebarOpen: true,
    binderBarOpen: true,
    rightTab: null,
  },
  scrivener: {
    sidebarOpen: true,
    inspectorOpen: true,
    sections: { ...DEFAULT_SCRIVENER_SECTIONS },
  },
  editor: {
    sidebarOpen: true,
    binderRailOpen: true,
    rightTab: null,
    activeChapterId: null,
    scrollYByChapter: {},
  },
  workspace: {
    panels: [],
    researchPanelSizes: {},
  },
  sidebarWidths: buildDefaultSidebarWidths(),
  layoutSurfaceRatios: buildDefaultLayoutSurfaceRatios(),
});
