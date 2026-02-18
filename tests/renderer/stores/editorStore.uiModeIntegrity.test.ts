import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EditorSettings } from "../../../src/shared/types/index.js";

const mocked = vi.hoisted(() => {
  const state = {
    lastPayload: null as EditorSettings | null,
  };

  return {
    state,
    api: {
      settings: {
        getEditor: vi.fn(),
        setEditor: vi.fn(),
      },
      logger: {
        warn: vi.fn(),
      },
    },
  };
});

vi.mock("../../../src/renderer/src/services/api", () => ({
  api: mocked.api,
}));

import { useEditorStore } from "../../../src/renderer/src/stores/editorStore.js";

const BASE_SETTINGS: EditorSettings = {
  fontFamily: "mono",
  fontPreset: "victor-mono",
  fontSize: 19,
  lineHeight: 1.65,
  maxWidth: 1000,
  theme: "dark",
  themeTemp: "cool",
  themeContrast: "high",
  themeAccent: "violet",
  themeTexture: false,
  uiMode: "default",
};

function readEditorSettings(): EditorSettings {
  const state = useEditorStore.getState();
  return {
    fontFamily: state.fontFamily,
    fontPreset: state.fontPreset,
    fontSize: state.fontSize,
    lineHeight: state.lineHeight,
    maxWidth: state.maxWidth,
    theme: state.theme,
    themeTemp: state.themeTemp,
    themeContrast: state.themeContrast,
    themeAccent: state.themeAccent,
    themeTexture: state.themeTexture,
    uiMode: state.uiMode,
  };
}

describe("editorStore uiMode integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEditorStore.setState(BASE_SETTINGS);

    mocked.api.settings.setEditor.mockImplementation(async (payload: EditorSettings) => {
      mocked.state.lastPayload = payload;
      return { success: true, data: payload };
    });
  });

  it("changes only uiMode in store state", async () => {
    const before = readEditorSettings();

    await useEditorStore.getState().setUiMode("docs");

    const after = readEditorSettings();
    expect(after.uiMode).toBe("docs");
    expect({ ...after, uiMode: before.uiMode }).toEqual(before);
  });

  it("sends full editor settings payload when changing mode", async () => {
    await useEditorStore.getState().setUiMode("editor");

    expect(mocked.state.lastPayload).toEqual({
      ...BASE_SETTINGS,
      uiMode: "editor",
    });
  });
});
