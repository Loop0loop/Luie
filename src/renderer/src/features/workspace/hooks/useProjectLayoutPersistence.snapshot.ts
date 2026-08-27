import type { ResizablePanelData } from "@renderer/features/workspace/stores/uiStore";
import {
  sanitizeWorkspacePanels,
  type ProjectLayoutState,
} from "@renderer/features/workspace/stores/projectLayoutStore";

// NOTE: 순수 비교/직렬화 헬퍼. hook 안에 두면 매 render마다 재생성되므로 module scope에 둔다.

/** 0.1 미만 차이는 같은 값으로 본다. drag 커밋의 반올림 잡음을 저장으로 흘리지 않기 위함. */
const RATIO_EPSILON = 0.1;

export const areScrivenerSectionsEqual = (
  left: ProjectLayoutState["scrivener"]["sections"],
  right: ProjectLayoutState["scrivener"]["sections"],
): boolean =>
  left.manuscript === right.manuscript &&
  left.characters === right.characters &&
  left.events === right.events &&
  left.factions === right.factions &&
  left.world === right.world &&
  left.scrap === right.scrap &&
  left.snapshots === right.snapshots &&
  left.analysis === right.analysis &&
  left.trash === right.trash;

export const areNumberRecordsEqual = (
  left: Record<string, number>,
  right: Record<string, number>,
): boolean => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (Math.abs((left[key] ?? 0) - (right[key] ?? 0)) >= RATIO_EPSILON) {
      return false;
    }
  }
  return true;
};

export const serializeWorkspacePanels = (
  inputPanels: ResizablePanelData[],
): ResizablePanelData[] =>
  sanitizeWorkspacePanels(
    inputPanels.map((panel) => ({
      id: panel.id,
      content:
        panel.content.type === "research"
          ? {
              type: "research",
              id: panel.content.id,
              tab: panel.content.tab,
            }
          : panel.content.type === "editor"
            ? { type: "editor", id: panel.content.id }
            : panel.content.type === "export"
              ? { type: "export" }
              : { type: panel.content.type },
      size: panel.size,
    })),
  );

/**
 * default 레이아웃은 research 탭이 패널 하나를 공유하므로(useSplitView가 research 패널을 하나만
 * 유지하고 tab만 교체) 폭도 탭별이 아니라 하나만 저장한다.
 */
export const buildResearchPanelSize = (
  saved: number | undefined,
  inputPanels: ResizablePanelData[],
): number | undefined => {
  const researchPanel = inputPanels.find(
    (panel) => panel.content.type === "research",
  );
  if (
    researchPanel === undefined ||
    typeof researchPanel.size !== "number" ||
    !Number.isFinite(researchPanel.size)
  ) {
    return saved;
  }
  return researchPanel.size;
};

/** default 이외 레이아웃은 탭별 폭 맵을 계속 쓴다. */
export const buildResearchPanelSizes = (
  saved: ProjectLayoutState["workspace"]["researchPanelSizes"],
  inputPanels: ResizablePanelData[],
): ProjectLayoutState["workspace"]["researchPanelSizes"] => {
  const next = { ...saved };
  for (const panel of inputPanels) {
    if (panel.content.type !== "research" || !panel.content.tab) continue;
    if (typeof panel.size !== "number" || !Number.isFinite(panel.size)) {
      continue;
    }
    next[panel.content.tab] = panel.size;
  }
  return next;
};

export const areWorkspacePanelsEqual = (
  left: ResizablePanelData[],
  right: ResizablePanelData[],
): boolean => {
  if (left.length !== right.length) return false;
  return left.every((leftPanel, index) => {
    const rightPanel = right[index];
    return (
      rightPanel !== undefined &&
      leftPanel.id === rightPanel.id &&
      leftPanel.content.type === rightPanel.content.type &&
      leftPanel.content.id === rightPanel.content.id &&
      leftPanel.content.tab === rightPanel.content.tab &&
      Math.abs(leftPanel.size - rightPanel.size) < RATIO_EPSILON
    );
  });
};

export const areResearchPanelSizesEqual = (
  left: ProjectLayoutState["workspace"]["researchPanelSizes"],
  right: ProjectLayoutState["workspace"]["researchPanelSizes"],
): boolean => {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (
      Math.abs(
        (left[key as keyof typeof left] ?? 0) -
          (right[key as keyof typeof right] ?? 0),
      ) >= RATIO_EPSILON
    ) {
      return false;
    }
  }
  return true;
};

export const areResearchPanelSizeEqual = (
  left: number | undefined,
  right: number | undefined,
): boolean => {
  if (left === undefined || right === undefined) return left === right;
  return Math.abs(left - right) < RATIO_EPSILON;
};
