import { describe, expect, it } from "vitest";
import { deriveEditorFontFamilyCss } from "../../../src/renderer/src/features/editor/hooks/useEditorConfig";

describe("deriveEditorFontFamilyCss", () => {
  it("returns custom font family when provided", () => {
    const css = deriveEditorFontFamilyCss({
      fontFamily: "system-ui",
      customFontFamily: "Pretendard",
    });

    expect(css).toBe("Pretendard");
  });

  it("returns preset serif token for serif", () => {
    const css = deriveEditorFontFamilyCss({
      fontFamily: "serif",
    });

    expect(css).toBe("var(--font-serif)");
  });

  it("maps arbitrary system font name to fallback css chain", () => {
    const css = deriveEditorFontFamilyCss({
      fontFamily: "Noto Sans KR",
    });

    expect(css).toBe('"Noto Sans KR", var(--font-sans)');
  });

  it("uses inter preset css when fontPreset is inter", () => {
    const css = deriveEditorFontFamilyCss({
      fontFamily: "system-ui",
      fontPreset: "inter",
    });

    expect(css).toBe('"Inter Variable", "Inter", var(--font-sans)');
  });
});
