type PanelSizeLike = {
  asPercentage: number;
  inPixels: number;
};

export const shouldCloseDocsPanelOnResize = (
  panelSize: PanelSizeLike,
  isOpening: boolean,
  isClosing: boolean,
): boolean => {
  if (isOpening || isClosing) return false;
  return panelSize.asPercentage <= 0.1 || panelSize.inPixels <= 1;
};

export const shouldCloseDocsRightPanelOnResize = shouldCloseDocsPanelOnResize;
