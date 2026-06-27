export type MainLayoutResizeSurface =
  | "default.sidebar"
  | "default.panel"
  | "canvas.activity"
  | "canvas.binder";

type MainLayoutPanelSize = {
  asPercentage: number;
  inPixels: number;
};

export const shouldPersistMainLayoutContext = (
  surface: MainLayoutResizeSurface | null,
): boolean =>
  surface !== "default.sidebar" && surface !== "canvas.activity";

export const shouldCloseMainLayoutPanelOnResize = (
  panelSize: MainLayoutPanelSize,
  isOpening: boolean,
  isClosing: boolean,
): boolean => {
  if (isOpening || isClosing) return false;
  return panelSize.asPercentage <= 0.1 || panelSize.inPixels <= 1;
};
