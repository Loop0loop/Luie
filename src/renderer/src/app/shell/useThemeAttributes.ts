import { useLayoutEffect } from "react";

export function useThemeAttributes({
  enableAnimations,
  theme,
  themeAccent,
  themeContrast,
}: {
  enableAnimations: boolean;
  theme: string;
  themeAccent: string | null;
  themeContrast: string | null;
}) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeContrast)
      document.documentElement.setAttribute("data-contrast", themeContrast);
    if (themeAccent)
      document.documentElement.setAttribute("data-accent", themeAccent);
    document.documentElement.setAttribute(
      "data-animations",
      enableAnimations ? "on" : "off",
    );
  }, [
    theme,
    themeContrast,
    themeAccent,
    enableAnimations,
  ]);
}
