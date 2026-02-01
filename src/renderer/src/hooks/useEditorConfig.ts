import { useMemo } from "react";
import { useEditorStore } from "../stores/editorStore";

const FONT_PRESET_MAP: Record<string, string> = {
  default: "var(--font-sans)",
  lora: '"Lora Variable", "Lora", var(--font-serif)',
  bitter: '"Bitter Variable", "Bitter", var(--font-serif)',
  "source-serif": '"Source Serif 4 Variable", "Source Serif 4", var(--font-serif)',
  montserrat: '"Montserrat Variable", "Montserrat", var(--font-sans)',
  "nunito-sans": '"Nunito Sans Variable", "Nunito Sans", var(--font-sans)',
  "victor-mono": '"Victor Mono Variable", "Victor Mono", var(--font-mono)',
};

export function useEditorConfig() {
  const { fontFamily, fontPreset, fontSize, lineHeight } = useEditorStore();

  const fontFamilyCss = useMemo(() => {
    if (fontPreset && fontPreset !== "default") {
      return FONT_PRESET_MAP[fontPreset] ?? "var(--font-sans)";
    }
    return fontFamily === "serif"
      ? "var(--font-serif)"
      : fontFamily === "mono"
        ? "var(--font-mono)"
        : "var(--font-sans)";
  }, [fontFamily, fontPreset]);

  return {
    fontFamilyCss,
    fontSize,
    lineHeight,
    getFontFamily: () => fontFamilyCss,
  };
}
