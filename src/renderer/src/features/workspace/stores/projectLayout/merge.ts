import {
  normalizeLayoutSurfaceRatiosWithMigrations,
} from "@renderer/shared/constants/layoutSizing";
import { normalizeSidebarWidthsWithMigrations } from "@renderer/shared/constants/sidebarSizing";
import {
  sanitizePersistedDocsRightTab,
  sanitizeResearchPanelSizes,
  sanitizeWorkspacePanels,
} from "./sanitize";
import type { ProjectLayoutPatch, ProjectLayoutState } from "./types";

export const mergeProjectLayoutState = (
  previous: ProjectLayoutState,
  patch: ProjectLayoutPatch,
): ProjectLayoutState => {
  const patchedSections = patch.scrivener?.sections;
  return {
    main: {
      ...previous.main,
      ...(patch.main ?? {}),
    },
    docs: {
      ...previous.docs,
      ...(patch.docs
        ? {
            ...patch.docs,
            rightTab:
              patch.docs.rightTab === undefined
                ? previous.docs.rightTab
                : sanitizePersistedDocsRightTab(patch.docs.rightTab),
          }
        : {}),
    },
    scrivener: {
      ...previous.scrivener,
      ...(patch.scrivener ?? {}),
      sections: patchedSections
        ? {
            ...previous.scrivener.sections,
            ...patchedSections,
          }
        : previous.scrivener.sections,
    },
    editor: {
      ...previous.editor,
      ...(patch.editor ?? {}),
      rightTab:
        patch.editor?.rightTab === undefined
          ? previous.editor.rightTab
          : sanitizePersistedDocsRightTab(patch.editor.rightTab),
      scrollYByChapter: {
        ...previous.editor?.scrollYByChapter,
        ...(patch.editor?.scrollYByChapter ?? {}),
      },
    },
    workspace: patch.workspace
      ? {
          ...previous.workspace,
          panels: patch.workspace.panels
            ? sanitizeWorkspacePanels(patch.workspace.panels)
            : previous.workspace.panels,
          researchPanelSizes: patch.workspace.researchPanelSizes
            ? {
                ...previous.workspace.researchPanelSizes,
                ...sanitizeResearchPanelSizes(
                  patch.workspace.researchPanelSizes,
                ),
              }
            : previous.workspace.researchPanelSizes,
        }
      : previous.workspace,
    sidebarWidths: patch.sidebarWidths
      ? normalizeSidebarWidthsWithMigrations({
          ...previous.sidebarWidths,
          ...patch.sidebarWidths,
        })
      : previous.sidebarWidths,
    layoutSurfaceRatios: patch.layoutSurfaceRatios
      ? normalizeLayoutSurfaceRatiosWithMigrations(
          {
            ...previous.layoutSurfaceRatios,
            ...patch.layoutSurfaceRatios,
          },
          patch.sidebarWidths ?? previous.sidebarWidths,
        )
      : previous.layoutSurfaceRatios,
  };
};
