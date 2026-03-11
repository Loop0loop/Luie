export type FocusedClosableTarget =
  | { kind: "panel"; id: string }
  | { kind: "docs-tab" };

let focusedClosableTarget: FocusedClosableTarget | null = null;

const isSameFocusedClosableTarget = (
  left: FocusedClosableTarget | null,
  right: FocusedClosableTarget | null,
): boolean =>
  left?.kind === right?.kind &&
  (left?.kind !== "panel" ||
    left.id === (right?.kind === "panel" ? right.id : undefined));

export const getFocusedClosableTarget = (): FocusedClosableTarget | null =>
  focusedClosableTarget;

export const setFocusedClosableTarget = (
  target: FocusedClosableTarget | null,
): boolean => {
  if (isSameFocusedClosableTarget(focusedClosableTarget, target)) {
    return false;
  }
  focusedClosableTarget = target;
  return true;
};

export const clearFocusedClosableTarget = (): boolean => {
  if (focusedClosableTarget === null) {
    return false;
  }
  focusedClosableTarget = null;
  return true;
};
