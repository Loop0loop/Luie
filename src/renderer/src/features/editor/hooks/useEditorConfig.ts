import { useMemo, useEffect } from "react";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";
import { loadInterFont } from "@renderer/app/fontLoader";

export function deriveEditorFontFamilyCss(input: {
  fontFamily: string;
  fontPreset?: string;
  customFontFamily?: string;
}): string {
  const { fontFamily, fontPreset, customFontFamily } = input;

  if (customFontFamily?.trim()) {
    return customFontFamily.trim();
  }

  if (fontPreset === "inter") {
    return '"Inter Variable", "Inter", var(--font-sans)';
  }

  if (fontFamily === "system-ui") {
    return "var(--font-sans)";
  }

  if (fontFamily === "serif") {
    return "var(--font-serif)";
  }

  if (fontFamily === "mono") {
    return "var(--font-mono)";
  }

  const trimmedFamily = fontFamily.trim();
  return trimmedFamily
    ? `"${trimmedFamily}", var(--font-sans)`
    : "var(--font-sans)";
}

export function useEditorConfig() {
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontPreset = useEditorStore((state) => state.fontPreset);
  const customFontFamily = useEditorStore((state) => state.customFontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);
  const letterSpacing = useEditorStore((state) => state.letterSpacing ?? 0.02);
  const wordSpacing = useEditorStore((state) => state.wordSpacing ?? 0.04);
  const paragraphSpacing = useEditorStore((state) => state.paragraphSpacing ?? 1.0);

  useEffect(() => {
    if (fontPreset === "inter") {
      void loadInterFont();
    }
  }, [fontPreset]);

  const fontFamilyCss = useMemo(() => {
    return deriveEditorFontFamilyCss({
      fontFamily,
      fontPreset,
      customFontFamily,
    });
  }, [fontFamily, fontPreset, customFontFamily]);

  return {
    fontFamilyCss,
    fontSize,
    lineHeight,
    letterSpacing,
    wordSpacing,
    paragraphSpacing,
    getFontFamily: () => fontFamilyCss,
  };
}
