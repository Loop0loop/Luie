import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => {
  const uiState = {
    contextWidth: 320,
    isSplitView: false,
    setDocsRightTab: vi.fn(),
    setWorldTab: vi.fn(),
    setContextWidth: vi.fn(),
    setRightPanelContent: vi.fn(),
    setSplitView: vi.fn(),
  };

  const editorState = {
    uiMode: "default" as "default" | "docs",
  };

  const characterState = {
    items: [{ id: "char-1", name: "Hero" }],
    setCurrentCharacter: vi.fn(),
  };

  const termState = {
    items: [{ id: "term-1", term: "Kingdom" }],
    setCurrentTerm: vi.fn(),
  };

  return {
    uiState,
    editorState,
    characterState,
    termState,
  };
});

vi.mock("../../../src/renderer/src/stores/uiStore", () => ({
  useUIStore: {
    getState: () => mocked.uiState,
  },
}));

vi.mock("../../../src/renderer/src/stores/editorStore", () => ({
  useEditorStore: {
    getState: () => mocked.editorState,
  },
}));

vi.mock("../../../src/renderer/src/stores/characterStore", () => ({
  useCharacterStore: {
    getState: () => mocked.characterState,
    subscribe: () => () => undefined,
  },
}));

vi.mock("../../../src/renderer/src/stores/termStore", () => ({
  useTermStore: {
    getState: () => mocked.termState,
    subscribe: () => () => undefined,
  },
}));

import { smartLinkService } from "../../../src/main/services/core/SmartLinkService.js";

describe("smartLinkService.openItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocked.editorState.uiMode = "default";
    mocked.uiState.contextWidth = 320;
    mocked.uiState.isSplitView = false;

    mocked.characterState.items = [{ id: "char-1", name: "Hero" }];
    mocked.termState.items = [{ id: "term-1", term: "Kingdom" }];
  });

  it("opens character tab in docs mode and expands collapsed panel", () => {
    mocked.editorState.uiMode = "docs";
    mocked.uiState.contextWidth = 0;

    smartLinkService.openItem("char-1", "character");

    expect(mocked.uiState.setDocsRightTab).toHaveBeenCalledWith("character");
    expect(mocked.uiState.setContextWidth).toHaveBeenCalledWith(320);
    expect(mocked.uiState.setWorldTab).not.toHaveBeenCalled();
    expect(mocked.uiState.setRightPanelContent).not.toHaveBeenCalled();
    expect(mocked.uiState.setSplitView).not.toHaveBeenCalled();
    expect(mocked.characterState.setCurrentCharacter).toHaveBeenCalledWith(
      mocked.characterState.items[0],
    );
  });

  it("opens world terms tab in docs mode when clicking a term", () => {
    mocked.editorState.uiMode = "docs";
    mocked.uiState.contextWidth = 20;

    smartLinkService.openItem("term-1", "term");

    expect(mocked.uiState.setDocsRightTab).toHaveBeenCalledWith("world");
    expect(mocked.uiState.setWorldTab).toHaveBeenCalledWith("terms");
    expect(mocked.uiState.setContextWidth).toHaveBeenCalledWith(320);
    expect(mocked.termState.setCurrentTerm).toHaveBeenCalledWith(
      mocked.termState.items[0],
    );
  });

  it("opens split research panel in default mode", () => {
    mocked.editorState.uiMode = "default";
    mocked.uiState.isSplitView = false;

    smartLinkService.openItem("term-1", "term");

    expect(mocked.uiState.setRightPanelContent).toHaveBeenCalledWith({
      type: "research",
      tab: "world",
    });
    expect(mocked.uiState.setWorldTab).toHaveBeenCalledWith("terms");
    expect(mocked.uiState.setSplitView).toHaveBeenCalledWith(true);
    expect(mocked.termState.setCurrentTerm).toHaveBeenCalledWith(
      mocked.termState.items[0],
    );
  });
});
