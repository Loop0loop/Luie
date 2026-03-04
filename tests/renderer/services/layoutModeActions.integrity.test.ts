import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLayoutModeActions } from "../../../src/renderer/src/features/workspace/services/layoutModeActions";
import type { DocsRightTab } from "../../../src/renderer/src/features/workspace/stores/uiStore";

type OptionsOverrides = Partial<Parameters<typeof createLayoutModeActions>[0]>;

const createOptions = (overrides: OptionsOverrides = {}) => ({
  isDocsMode: false,
  isContextOpen: true,
  isSidebarOpen: true,
  docsRightTab: null as DocsRightTab,
  activeChapterId: "chapter-1",
  openDocsRightTab: vi.fn(),
  openRightPanelTab: vi.fn(),
  closeRightPanel: vi.fn(),
  toggleLeftSidebar: vi.fn(),
  setDocsRightTab: vi.fn(),
  setContextOpen: vi.fn(),
  setSidebarOpen: vi.fn(),
  addPanel: vi.fn(),
  handleSelectResearchItem: vi.fn(),
  handleOpenExport: vi.fn(),
  onToggleManuscriptLegacy: vi.fn(),
  onOpenSidebarSectionLegacy: vi.fn(),
  ...overrides,
});

describe("layoutModeActions integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes research action by mode without mixed side-effects", () => {
    const docsOptions = createOptions({ isDocsMode: true });
    createLayoutModeActions(docsOptions).openResearchTab("world");

    expect(docsOptions.openRightPanelTab).toHaveBeenCalledWith("world");
    expect(docsOptions.addPanel).not.toHaveBeenCalled();
    expect(docsOptions.handleSelectResearchItem).not.toHaveBeenCalled();

    const defaultOptions = createOptions({ isDocsMode: false });
    createLayoutModeActions(defaultOptions).openResearchTab("world");

    expect(defaultOptions.addPanel).toHaveBeenCalledWith({
      type: "research",
      tab: "world",
    });
    expect(defaultOptions.openRightPanelTab).not.toHaveBeenCalled();
  });

  it("keeps context toggle semantics mode-specific", () => {
    const docsWithTab = createOptions({
      isDocsMode: true,
      docsRightTab: "analysis",
    });
    createLayoutModeActions(docsWithTab).toggleContextPanel();
    expect(docsWithTab.closeRightPanel).toHaveBeenCalledTimes(1);
    expect(docsWithTab.setContextOpen).not.toHaveBeenCalled();

    const docsWithoutTab = createOptions({
      isDocsMode: true,
      docsRightTab: null,
    });
    createLayoutModeActions(docsWithoutTab).toggleContextPanel();
    expect(docsWithoutTab.openRightPanelTab).toHaveBeenCalledWith("character");
    expect(docsWithoutTab.setContextOpen).not.toHaveBeenCalled();

    const defaultMode = createOptions({
      isDocsMode: false,
      isContextOpen: true,
    });
    createLayoutModeActions(defaultMode).toggleContextPanel();
    expect(defaultMode.setContextOpen).toHaveBeenCalledWith(false);
    expect(defaultMode.closeRightPanel).not.toHaveBeenCalled();
  });

  it("opens editor split only when chapter exists and by mode", () => {
    const noChapter = createOptions({ activeChapterId: null });
    createLayoutModeActions(noChapter).openEditorInSplit();
    expect(noChapter.addPanel).not.toHaveBeenCalled();
    expect(noChapter.openRightPanelTab).not.toHaveBeenCalled();

    const docsMode = createOptions({
      isDocsMode: true,
      activeChapterId: "chapter-9",
    });
    createLayoutModeActions(docsMode).openEditorInSplit();
    expect(docsMode.addPanel).toHaveBeenCalledWith({
      type: "editor",
      id: "chapter-9",
    });
    expect(docsMode.openRightPanelTab).toHaveBeenCalledWith("editor");

    const defaultMode = createOptions({
      isDocsMode: false,
      activeChapterId: "chapter-9",
    });
    createLayoutModeActions(defaultMode).openEditorInSplit();
    expect(defaultMode.addPanel).toHaveBeenCalledWith({
      type: "editor",
      id: "chapter-9",
    });
    expect(defaultMode.openRightPanelTab).not.toHaveBeenCalled();
  });
});
