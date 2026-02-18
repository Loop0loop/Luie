import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLayoutModeActions } from "../../../src/renderer/src/services/layoutModeActions.js";
import type { DocsRightTab } from "../../../src/renderer/src/stores/uiStore.js";

type OptionsOverrides = Partial<Parameters<typeof createLayoutModeActions>[0]>;

const createOptions = (overrides: OptionsOverrides = {}) => ({
  isDocsMode: false,
  isContextOpen: true,
  isSidebarOpen: true,
  docsRightTab: null as DocsRightTab,
  activeChapterId: "chapter-1",
  openDocsRightTab: vi.fn(),
  setDocsRightTab: vi.fn(),
  setContextOpen: vi.fn(),
  setSidebarOpen: vi.fn(),
  setSplitSide: vi.fn(),
  setRightPanelContent: vi.fn(),
  handleSelectResearchItem: vi.fn(),
  handleOpenExport: vi.fn(),
  handleSplitView: vi.fn(),
  onToggleManuscriptLegacy: vi.fn(),
  onOpenSidebarSectionLegacy: vi.fn(),
  ...overrides,
});

describe("layoutModeActions integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes research tab action by mode without mixed side-effects", () => {
    const docsOptions = createOptions({ isDocsMode: true });
    const docsActions = createLayoutModeActions(docsOptions);
    docsActions.openResearchTab("world", "right");

    expect(docsOptions.openDocsRightTab).toHaveBeenCalledWith("world");
    expect(docsOptions.setSplitSide).not.toHaveBeenCalled();
    expect(docsOptions.handleSelectResearchItem).not.toHaveBeenCalled();

    const defaultOptions = createOptions({ isDocsMode: false });
    const defaultActions = createLayoutModeActions(defaultOptions);
    defaultActions.openResearchTab("world", "left");

    expect(defaultOptions.setSplitSide).toHaveBeenCalledWith("left");
    expect(defaultOptions.handleSelectResearchItem).toHaveBeenCalledWith("world");
    expect(defaultOptions.openDocsRightTab).not.toHaveBeenCalled();
  });

  it("keeps context panel toggle semantics mode-specific", () => {
    const docsWithTab = createOptions({
      isDocsMode: true,
      docsRightTab: "analysis",
    });
    createLayoutModeActions(docsWithTab).toggleContextPanel();
    expect(docsWithTab.setDocsRightTab).toHaveBeenCalledWith(null);
    expect(docsWithTab.setContextOpen).not.toHaveBeenCalled();

    const docsWithoutTab = createOptions({
      isDocsMode: true,
      docsRightTab: null,
    });
    createLayoutModeActions(docsWithoutTab).toggleContextPanel();
    expect(docsWithoutTab.openDocsRightTab).toHaveBeenCalledWith("character");
    expect(docsWithoutTab.setContextOpen).not.toHaveBeenCalled();

    const defaultMode = createOptions({
      isDocsMode: false,
      isContextOpen: true,
    });
    createLayoutModeActions(defaultMode).toggleContextPanel();
    expect(defaultMode.setContextOpen).toHaveBeenCalledWith(false);
    expect(defaultMode.setDocsRightTab).not.toHaveBeenCalled();
  });

  it("opens editor in split only when chapter exists and by mode", () => {
    const noChapter = createOptions({ activeChapterId: null });
    createLayoutModeActions(noChapter).openEditorInSplit("right");
    expect(noChapter.setRightPanelContent).not.toHaveBeenCalled();
    expect(noChapter.handleSplitView).not.toHaveBeenCalled();

    const docsMode = createOptions({
      isDocsMode: true,
      activeChapterId: "chapter-9",
    });
    createLayoutModeActions(docsMode).openEditorInSplit("right");
    expect(docsMode.setRightPanelContent).toHaveBeenCalledWith({
      type: "editor",
      id: "chapter-9",
    });
    expect(docsMode.openDocsRightTab).toHaveBeenCalledWith("editor");
    expect(docsMode.handleSplitView).not.toHaveBeenCalled();

    const defaultMode = createOptions({
      isDocsMode: false,
      activeChapterId: "chapter-9",
    });
    createLayoutModeActions(defaultMode).openEditorInSplit("left");
    expect(defaultMode.setSplitSide).toHaveBeenCalledWith("left");
    expect(defaultMode.handleSplitView).toHaveBeenCalledWith("vertical", "chapter-9");
    expect(defaultMode.openDocsRightTab).not.toHaveBeenCalled();
  });
});
