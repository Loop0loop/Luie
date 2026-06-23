import { useLayoutEffect } from "react";

export function useThemeAttributes({
  enableAnimations,
  theme,
  themeAccent,
  themeContrast,
  themeTemp,
  themeTexture,
}: {
  enableAnimations: boolean;
  theme: string;
  themeAccent: string | null;
  themeContrast: string | null;
  themeTemp: string | null;
  themeTexture: boolean;
}) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeTemp)
      document.documentElement.setAttribute("data-temp", themeTemp);
    if (themeContrast)
      document.documentElement.setAttribute("data-contrast", themeContrast);
    if (themeAccent)
      document.documentElement.setAttribute("data-accent", themeAccent);
    document.documentElement.setAttribute("data-texture", String(themeTexture));
    document.documentElement.setAttribute(
      "data-animations",
      enableAnimations ? "on" : "off",
    );
  }, [
    theme,
    themeTemp,
    themeContrast,
    themeAccent,
    themeTexture,
    enableAnimations,
  ]);
}
