import type { GroupImperativeHandle } from "react-resizable-panels";

/**
 * 외부 `features/workspace/utils/panelGroupLayout.ts`를 캔버스 안으로
 * 인용. PanelGroup의 현재 layout이 기대하는 panel 셋과 같은지 검사할 때
 * 쓴다. 캔버스 자체 layout hook이 직접 의존한다.
 */

const normalizePanelIds = (panelIds: readonly string[]): string[] =>
  panelIds.filter(Boolean);

export const groupLayoutMatchesPanels = (
  group: GroupImperativeHandle | null,
  expectedPanelIds: readonly string[],
): boolean => {
  if (!group) return false;
  const layout = group.getLayout();
  const currentPanelIds = Object.keys(layout);
  const normalized = normalizePanelIds(expectedPanelIds);
  if (currentPanelIds.length !== normalized.length) return false;
  return normalized.every((panelId) => panelId in layout);
};
