export type MainLayoutResizeSurface =
  | "default.sidebar"
  | "default.panel"
  | "canvas.activity"
  | "canvas.binder";

export type MainLayoutPersistTarget = "sidebar" | "context" | "none";

type MainLayoutPanelSize = {
  asPercentage: number;
  inPixels: number;
};

export const getMainLayoutPersistTarget = (
  surface: MainLayoutResizeSurface | null,
): MainLayoutPersistTarget => {
  switch (surface) {
    case "default.sidebar":
    case "canvas.activity":
      return "sidebar";
    case "default.panel":
    case "canvas.binder":
      return "context";
    default:
      return "none";
  }
};

export const shouldPersistMainLayoutContext = (
  surface: MainLayoutResizeSurface | null,
): boolean => getMainLayoutPersistTarget(surface) !== "sidebar";

export const shouldCloseMainLayoutPanelOnResize = (
  panelSize: MainLayoutPanelSize,
  isOpening: boolean,
  isClosing: boolean,
): boolean => {
  if (isOpening || isClosing) return false;
  return panelSize.asPercentage <= 0.1 || panelSize.inPixels <= 1;
};
