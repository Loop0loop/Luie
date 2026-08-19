export interface CanvasColorOption {
  readonly label: string;
  readonly value: string;
}

export const CANVAS_COLOR_PALETTE: readonly CanvasColorOption[] = [
  { label: "Purple", value: "#bf5af2" },
  { label: "Blue", value: "#0a84ff" },
  { label: "Teal", value: "#64d2ff" },
  { label: "Green", value: "#30d158" },
  { label: "Orange", value: "#ff9f0a" },
  { label: "Yellow", value: "#ffd60a" },
  { label: "Red", value: "#ff453a" },
  { label: "Neutral", value: "#98989d" },
] as const;
