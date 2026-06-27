export type MainLayoutResizeSurface =
  | "default.sidebar"
  | "default.panel"
  | "canvas.activity"
  | "canvas.binder";

export const shouldPersistMainLayoutContext = (
  surface: MainLayoutResizeSurface | null,
): boolean =>
  surface !== "default.sidebar" && surface !== "canvas.activity";
