import { useLayoutEffect } from "react";

export function useThemeAttributes({
  enableAnimations,
  theme,
  themeAccent,
  themeContrast,
  themeTemp,
}: {
  enableAnimations: boolean;
  theme: string;
  themeAccent: string | null;
  themeContrast: string | null;
  themeTemp: string | null;
}) {
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (themeContrast)
      document.documentElement.setAttribute("data-contrast", themeContrast);
    if (themeTemp)
      document.documentElement.setAttribute("data-temp", themeTemp);
    document.documentElement.setAttribute(
      "data-animations",
      enableAnimations ? "on" : "off",
    );

    if (themeAccent) {
      if (themeAccent.startsWith("#")) {
        document.documentElement.setAttribute("data-accent", "custom");
        document.documentElement.style.setProperty("--text-accent", themeAccent);
        document.documentElement.style.setProperty("--accent-bg", themeAccent);
        document.documentElement.style.setProperty("--accent-bg-hover", themeAccent);
      } else {
        document.documentElement.setAttribute("data-accent", themeAccent);
        document.documentElement.style.removeProperty("--text-accent");
        document.documentElement.style.removeProperty("--accent-bg");
        document.documentElement.style.removeProperty("--accent-bg-hover");
      }
    } else {
      document.documentElement.removeAttribute("data-accent");
      document.documentElement.style.removeProperty("--text-accent");
      document.documentElement.style.removeProperty("--accent-bg");
      document.documentElement.style.removeProperty("--accent-bg-hover");
    }
  }, [
    theme,
    themeContrast,
    themeAccent,
    themeTemp,
    enableAnimations,
  ]);
}
