import { useMemo } from "react";
import { useEditorStore } from "@renderer/features/editor/stores/editorStore";

export function useEditorConfig() {
  const fontFamily = useEditorStore((state) => state.fontFamily);
  const fontPreset = useEditorStore((state) => state.fontPreset);
  const customFontFamily = useEditorStore((state) => state.customFontFamily);
  const fontSize = useEditorStore((state) => state.fontSize);
  const lineHeight = useEditorStore((state) => state.lineHeight);

  const fontFamilyCss = useMemo(() => {
    if (customFontFamily?.trim()) {
      return customFontFamily.trim();
    }

    if (fontPreset === "inter") {
      return '"Inter Variable", "Inter", var(--font-sans)';
    }

    if (fontFamily === "system-ui") {
      return "var(--font-sans)";
    }

    return fontFamily === "serif"
      ? "var(--font-serif)"
      : fontFamily === "mono"
        ? "var(--font-mono)"
        : "var(--font-sans)";
  }, [fontFamily, fontPreset, customFontFamily]);

  return {
    fontFamilyCss,
    fontSize,
    lineHeight,
    getFontFamily: () => fontFamilyCss,
  };
}
