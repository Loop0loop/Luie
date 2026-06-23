import {
  normalizeLayoutSurfaceRatiosWithMigrations,
} from "@renderer/shared/constants/layoutSizing";
import { normalizeSidebarWidthsWithMigrations } from "@renderer/shared/constants/sidebarSizing";
import type {
  ResearchTab,
  ResizablePanelData,
  ScrivenerSectionId,
  ScrivenerSectionsState,
} from "../uiStore";
import {
  DEFAULT_SCRIVENER_SECTIONS,
  PERSISTABLE_DOCS_TABS,
  PERSISTABLE_RESEARCH_TABS,
  WORKSPACE_PANEL_MAX_SIZE,
  WORKSPACE_PANEL_MIN_SIZE,
} from "./constants";
import { createDefaultProjectLayoutState } from "./defaults";
import type {
  DocsRightTabInput,
  PersistedDocsRightTab,
  ProjectLayoutState,
} from "./types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const sanitizeScrivenerSections = (input: unknown): ScrivenerSectionsState => {
  const next = { ...DEFAULT_SCRIVENER_SECTIONS };
  if (!isRecord(input)) return next;

  (Object.keys(DEFAULT_SCRIVENER_SECTIONS) as ScrivenerSectionId[]).forEach((section) => {
    if (typeof input[section] === "boolean") {
      next[section] = input[section] as boolean;
    }
  });
  return next;
};

const normalizeWorkspacePanelSize = (size: unknown): number | null => {
  if (typeof size !== "number" || !Number.isFinite(size)) return null;
  return Math.min(
    WORKSPACE_PANEL_MAX_SIZE,
    Math.max(WORKSPACE_PANEL_MIN_SIZE, size),
  );
};

export const sanitizeResearchPanelSizes = (
  input: unknown,
): Partial<Record<ResearchTab, number>> => {
  if (!isRecord(input)) return {};

  const sizes: Partial<Record<ResearchTab, number>> = {};
  for (const tab of PERSISTABLE_RESEARCH_TABS) {
    const size = normalizeWorkspacePanelSize(input[tab]);
    if (size !== null) {
      sizes[tab] = size;
    }
  }
  return sizes;
};

export const sanitizeWorkspacePanels = (
  input: unknown,
): ResizablePanelData[] => {
  if (!Array.isArray(input)) return [];

  const panels: ResizablePanelData[] = [];
  const seenIds = new Set<string>();

  for (const candidate of input) {
    if (!isRecord(candidate) || typeof candidate.id !== "string") continue;
    if (seenIds.has(candidate.id)) continue;

    const size = normalizeWorkspacePanelSize(candidate.size);
    if (size === null) continue;

    const content = isRecord(candidate.content) ? candidate.content : {};
    if (content.type === "research") {
      const tab = content.tab;
      if (typeof tab !== "string" || !PERSISTABLE_RESEARCH_TABS.has(tab as ResearchTab)) {
        continue;
      }
      panels.push({
        id: candidate.id,
        content: {
          type: "research",
          ...(typeof content.id === "string" ? { id: content.id } : {}),
          tab: tab as ResearchTab,
        },
        size,
      });
      seenIds.add(candidate.id);
      continue;
    }

    if (content.type === "editor" && typeof content.id === "string") {
      panels.push({
        id: candidate.id,
        content: { type: "editor", id: content.id },
        size,
      });
      seenIds.add(candidate.id);
      continue;
    }

    if (content.type === "export") {
      panels.push({
        id: candidate.id,
        content: { type: "export" },
        size,
      });
      seenIds.add(candidate.id);
    }
  }

  return panels.slice(0, 3);
};

export const sanitizePersistedDocsRightTab = (
  tab: DocsRightTabInput,
): PersistedDocsRightTab => {
  if (!tab || typeof tab !== "string") return null;
  return PERSISTABLE_DOCS_TABS.has(tab as Exclude<PersistedDocsRightTab, null>)
    ? (tab as PersistedDocsRightTab)
    : null;
};

export const sanitizeProjectLayoutState = (input: unknown): ProjectLayoutState => {
  const defaults = createDefaultProjectLayoutState();
  if (!isRecord(input)) return defaults;

  const mainInput = isRecord(input.main) ? input.main : {};
  const docsInput = isRecord(input.docs) ? input.docs : {};
  const scrivenerInput = isRecord(input.scrivener) ? input.scrivener : {};
  const editorInput = isRecord(input.editor) ? input.editor : {};
  const workspaceInput = isRecord(input.workspace) ? input.workspace : {};
  const docsSidebarOpen =
    typeof docsInput.sidebarOpen === "boolean"
      ? docsInput.sidebarOpen
      : defaults.docs.sidebarOpen;
  const docsBinderBarOpen =
    typeof docsInput.binderBarOpen === "boolean"
      ? docsInput.binderBarOpen
      : defaults.docs.binderBarOpen;
  const docsRightTab = sanitizePersistedDocsRightTab(
    docsInput.rightTab as DocsRightTabInput,
  );

  return {
    main: {
      sidebarOpen:
        typeof mainInput.sidebarOpen === "boolean"
          ? mainInput.sidebarOpen
          : defaults.main.sidebarOpen,
      contextOpen:
        typeof mainInput.contextOpen === "boolean"
          ? mainInput.contextOpen
          : defaults.main.contextOpen,
    },
    docs: {
      sidebarOpen: docsSidebarOpen,
      binderBarOpen: docsBinderBarOpen,
      rightTab: docsRightTab,
    },
    scrivener: {
      sidebarOpen:
        typeof scrivenerInput.sidebarOpen === "boolean"
          ? scrivenerInput.sidebarOpen
          : defaults.scrivener.sidebarOpen,
      inspectorOpen:
        typeof scrivenerInput.inspectorOpen === "boolean"
          ? scrivenerInput.inspectorOpen
          : defaults.scrivener.inspectorOpen,
      sections: sanitizeScrivenerSections(scrivenerInput.sections),
    },
    editor: {
      sidebarOpen:
        typeof editorInput.sidebarOpen === "boolean"
          ? editorInput.sidebarOpen
          : docsSidebarOpen,
      binderRailOpen:
        typeof editorInput.binderRailOpen === "boolean"
          ? editorInput.binderRailOpen
          : docsBinderBarOpen,
      rightTab:
        editorInput.rightTab === undefined
          ? docsRightTab
          : sanitizePersistedDocsRightTab(
              editorInput.rightTab as DocsRightTabInput,
            ),
      activeChapterId:
        typeof editorInput.activeChapterId === "string" || editorInput.activeChapterId === null
          ? editorInput.activeChapterId
          : defaults.editor.activeChapterId,
      scrollYByChapter: isRecord(editorInput.scrollYByChapter)
        ? (Object.fromEntries(
            Object.entries(editorInput.scrollYByChapter).filter(([, v]) => typeof v === "number")
          ) as Record<string, number>)
        : defaults.editor.scrollYByChapter,
    },
    workspace: {
      panels: sanitizeWorkspacePanels(workspaceInput.panels),
      researchPanelSizes: sanitizeResearchPanelSizes(
        workspaceInput.researchPanelSizes,
      ),
    },
    sidebarWidths: normalizeSidebarWidthsWithMigrations(input.sidebarWidths),
    layoutSurfaceRatios: normalizeLayoutSurfaceRatiosWithMigrations(
      input.layoutSurfaceRatios,
      input.sidebarWidths,
    ),
  };
};
