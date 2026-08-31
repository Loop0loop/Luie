import { normalizeLayoutSurfaceRatiosWithMigrations } from "@renderer/shared/constants/layoutSizing";
import { normalizeSidebarWidthsWithMigrations } from "@renderer/shared/constants/sidebarSizing";
import type {
  ResearchTab,
  ResizablePanelData,
  ScrivenerSectionId,
  ScrivenerSectionsState,
} from "../uiStore";
import {
  DEFAULT_SCRIVENER_SECTIONS,
  EDITOR_PANEL_MAX_WIDTH_PX,
  EDITOR_PANEL_MIN_WIDTH_PX,
  RESEARCH_PANEL_MAX_WIDTH_PX,
  RESEARCH_PANEL_MIN_WIDTH_PX,
  PERSISTABLE_DOCS_TABS,
  PERSISTABLE_RESEARCH_TABS,
  WORKSPACE_PANEL_MAX_SIZE,
  WORKSPACE_PANEL_MIN_SIZE,
} from "./constants";
import { createDefaultProjectLayoutState } from "./defaults";
import type {
  DocsRightTabInput,
  PersistedDocsRightTab,
  ProjectDefaultWorkspacePanelState,
  ProjectLayoutState,
  ProjectWorkspacePanelState,
} from "./types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const sanitizeScrivenerSections = (input: unknown): ScrivenerSectionsState => {
  const next = { ...DEFAULT_SCRIVENER_SECTIONS };
  if (!isRecord(input)) return next;

  (Object.keys(DEFAULT_SCRIVENER_SECTIONS) as ScrivenerSectionId[]).forEach(
    (section) => {
      if (typeof input[section] === "boolean") {
        next[section] = input[section] as boolean;
      }
    },
  );
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

export const sanitizeResearchPanelSize = (input: unknown): number | undefined =>
  normalizeWorkspacePanelSize(input) ?? undefined;

export const sanitizeResearchPanelWidthPx = (
  input: unknown,
): number | undefined => {
  if (typeof input !== "number" || !Number.isFinite(input)) return undefined;
  return Math.round(
    Math.min(RESEARCH_PANEL_MAX_WIDTH_PX, Math.max(RESEARCH_PANEL_MIN_WIDTH_PX, input)),
  );
};

export const sanitizeEditorPanelWidthPx = (
  input: unknown,
): number | undefined => {
  if (typeof input !== "number" || !Number.isFinite(input)) return undefined;
  return Math.round(
    Math.min(EDITOR_PANEL_MAX_WIDTH_PX, Math.max(EDITOR_PANEL_MIN_WIDTH_PX, input)),
  );
};

/**
 * 탭별 폭을 쓰던 payload를 단일 폭으로 승계한다. 사용자가 어느 탭에서든 넓게 잡아둔 폭보다
 * 좁아지지 않도록 최대값을 택한다.
 */
export const deriveResearchPanelSizeFromTabSizes = (
  sizes: Partial<Record<ResearchTab, number>>,
): number | undefined => {
  let widest: number | undefined;
  for (const size of Object.values(sizes)) {
    if (typeof size !== "number") continue;
    if (widest === undefined || size > widest) {
      widest = size;
    }
  }
  return widest;
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
      if (
        typeof tab !== "string" ||
        !PERSISTABLE_RESEARCH_TABS.has(tab as ResearchTab)
      ) {
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

  const lastExclusivePanel = [...panels]
    .reverse()
    .find(
      (panel) =>
        panel.content.type === "research" || panel.content.type === "editor",
    );
  const exclusiveType = lastExclusivePanel?.content.type;
  const compatiblePanels =
    exclusiveType === "research" || exclusiveType === "editor"
      ? panels.filter(
          (panel) =>
            (panel.content.type !== "research" &&
              panel.content.type !== "editor") ||
            (panel.content.type === exclusiveType &&
              (exclusiveType !== "editor" ||
                panel.id === lastExclusivePanel?.id)),
        )
      : panels;

  return compatiblePanels.slice(0, 3);
};

export const sanitizePersistedDocsRightTab = (
  tab: DocsRightTabInput,
): PersistedDocsRightTab => {
  if (!tab || typeof tab !== "string") return null;
  return PERSISTABLE_DOCS_TABS.has(tab as Exclude<PersistedDocsRightTab, null>)
    ? (tab as PersistedDocsRightTab)
    : null;
};

const sanitizeWorkspacePanelState = (
  input: unknown,
  fallback: ProjectWorkspacePanelState,
): ProjectWorkspacePanelState => {
  const value = isRecord(input) ? input : {};
  return {
    panels:
      value.panels === undefined
        ? fallback.panels
        : sanitizeWorkspacePanels(value.panels),
    researchPanelSizes:
      value.researchPanelSizes === undefined
        ? fallback.researchPanelSizes
        : sanitizeResearchPanelSizes(value.researchPanelSizes),
  };
};

const sanitizeDefaultWorkspacePanelState = (
  input: unknown,
  fallback: ProjectWorkspacePanelState,
): ProjectDefaultWorkspacePanelState => {
  const base = sanitizeWorkspacePanelState(input, fallback);
  const value = isRecord(input) ? input : {};
  const explicitSize = sanitizeResearchPanelSize(value.researchPanelSize);
  return {
    ...base,
    // 탭별 폭만 있던 기존 payload는 최대값으로 승계한다.
    researchPanelSize:
      explicitSize ?? deriveResearchPanelSizeFromTabSizes(base.researchPanelSizes),
    researchPanelWidthPx: sanitizeResearchPanelWidthPx(value.researchPanelWidthPx),
    editorPanelWidthPx: sanitizeEditorPanelWidthPx(value.editorPanelWidthPx),
  };
};

export const sanitizeProjectLayoutState = (
  input: unknown,
): ProjectLayoutState => {
  const defaults = createDefaultProjectLayoutState();
  if (!isRecord(input)) return defaults;

  const mainInput = isRecord(input.main) ? input.main : {};
  const docsInput = isRecord(input.docs) ? input.docs : {};
  const scrivenerInput = isRecord(input.scrivener) ? input.scrivener : {};
  const editorInput = isRecord(input.editor) ? input.editor : {};
  const workspaceInput = isRecord(input.workspace) ? input.workspace : {};
  const workspace = sanitizeWorkspacePanelState(workspaceInput, {
    panels: [],
    researchPanelSizes: {},
  });
  const workspaceLayoutsInput = isRecord(workspaceInput.byLayout)
    ? workspaceInput.byLayout
    : {};
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
        typeof editorInput.activeChapterId === "string" ||
        editorInput.activeChapterId === null
          ? editorInput.activeChapterId
          : defaults.editor.activeChapterId,
      scrollYByChapter: isRecord(editorInput.scrollYByChapter)
        ? (Object.fromEntries(
            Object.entries(editorInput.scrollYByChapter).filter(
              ([, v]) => typeof v === "number",
            ),
          ) as Record<string, number>)
        : defaults.editor.scrollYByChapter,
    },
    workspace: {
      ...workspace,
      byLayout: {
        // NOTE: 기존 공용 workspace 값은 default 레이아웃의 최초 분리값으로 승계한다.
        default: sanitizeDefaultWorkspacePanelState(
          workspaceLayoutsInput.default,
          workspace,
        ),
      },
    },
    sidebarWidths: normalizeSidebarWidthsWithMigrations(input.sidebarWidths),
    layoutSurfaceRatios: normalizeLayoutSurfaceRatiosWithMigrations(
      input.layoutSurfaceRatios,
      input.sidebarWidths,
    ),
  };
};
