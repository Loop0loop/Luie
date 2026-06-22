import type { GroupImperativeHandle } from "react-resizable-panels";

const normalizePanelIds = (panelIds: readonly string[]): string[] =>
  panelIds.filter(Boolean);

export const buildPanelGroupCompositionKey = (
  baseKey: string,
  panelIds: readonly string[],
): string => {
  const normalizedIds = normalizePanelIds(panelIds);
  return normalizedIds.length > 0
    ? `${baseKey}:${normalizedIds.join("|")}`
    : `${baseKey}:empty`;
};

export const groupLayoutMatchesPanels = (
  group: GroupImperativeHandle | null,
  expectedPanelIds: readonly string[],
): boolean => {
  if (!group) return false;

  const layout = group.getLayout();
  const currentPanelIds = Object.keys(layout);
  const normalizedExpectedPanelIds = normalizePanelIds(expectedPanelIds);

  if (currentPanelIds.length !== normalizedExpectedPanelIds.length) {
    return false;
  }

  return normalizedExpectedPanelIds.every((panelId) => panelId in layout);
};
