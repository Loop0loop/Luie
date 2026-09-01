import { beforeEach, describe, expect, it, vi } from "vitest";

const editorSettingsMock = vi.fn<() => Record<string, unknown>>(() => ({}));

vi.mock("electron", () => ({
  app: {
    getAppPath: () => "/mock/app-path",
    isPackaged: false,
  },
}));

vi.mock("../../../src/main/manager/settings/index.js", () => ({
  settingsManager: {
    getEditorSettings: () => editorSettingsMock(),
  },
}));

describe("resolveWindowBackgroundColor", () => {
  beforeEach(() => {
    editorSettingsMock.mockReset();
    editorSettingsMock.mockImplementation(() => ({}));
  });

  it("maps each theme's neutral temp to its --bg-app value", async () => {
    const { resolveWindowBackgroundColor } = await import(
      "../../../src/main/manager/window/windowChrome.js"
    );

    editorSettingsMock.mockImplementation(() => ({ theme: "dark", themeTemp: "neutral" }));
    expect(resolveWindowBackgroundColor()).toBe("#1a1a1c");

    editorSettingsMock.mockImplementation(() => ({ theme: "light", themeTemp: "neutral" }));
    expect(resolveWindowBackgroundColor()).toBe("#f9f9f7");

    editorSettingsMock.mockImplementation(() => ({ theme: "sepia", themeTemp: "neutral" }));
    expect(resolveWindowBackgroundColor()).toBe("#fbf2e2");
  });

  it("follows themeTemp variants", async () => {
    const { resolveWindowBackgroundColor } = await import(
      "../../../src/main/manager/window/windowChrome.js"
    );

    editorSettingsMock.mockImplementation(() => ({ theme: "dark", themeTemp: "cool" }));
    expect(resolveWindowBackgroundColor()).toBe("#171b1f");

    editorSettingsMock.mockImplementation(() => ({ theme: "dark", themeTemp: "warm" }));
    expect(resolveWindowBackgroundColor()).toBe("#1c1a19");

    editorSettingsMock.mockImplementation(() => ({ theme: "sepia", themeTemp: "warm" }));
    expect(resolveWindowBackgroundColor()).toBe("#fef2dc");
  });

  it("falls back to light neutral when theme fields are missing", async () => {
    const { resolveWindowBackgroundColor } = await import(
      "../../../src/main/manager/window/windowChrome.js"
    );

    expect(resolveWindowBackgroundColor()).toBe("#f9f9f7");
  });

  it("falls back to light neutral when settings manager throws", async () => {
    const { resolveWindowBackgroundColor } = await import(
      "../../../src/main/manager/window/windowChrome.js"
    );

    editorSettingsMock.mockImplementation(() => {
      throw new Error("store unavailable");
    });
    expect(resolveWindowBackgroundColor()).toBe("#f9f9f7");
  });
});
