export type ScrivenerLayoutResizeSurface =
  | "scrivener.binder"
  | "scrivener.inspector";

export type ScrivenerLayoutPersistTarget = "binder" | "inspector" | "all";

export const getScrivenerLayoutPersistTarget = (
  surface: ScrivenerLayoutResizeSurface | null,
): ScrivenerLayoutPersistTarget => {
  switch (surface) {
    case "scrivener.binder":
      return "binder";
    case "scrivener.inspector":
      return "inspector";
    default:
      return "all";
  }
};
