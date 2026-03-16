import type { WorldEntitySourceType, WorldEntityType } from "@shared/types";

export type GraphSurfaceTab =
  | "canvas"
  | "timeline"
  | "notes"
  | "entity"
  | "library";

export type GraphCreatePreset = {
  entityType: WorldEntitySourceType;
  subType?: WorldEntityType;
  label: string;
};
