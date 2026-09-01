import type { EditorSettings } from "@shared/types";

export type WizardStep =
  | "intro"
  | "theme"
  | "layout"
  | "prepare"
  | "finalizing"
  | "error";

export type FinalizingPhase = "initializing" | "completed" | "finishing";

export type ThemeChoice = EditorSettings["theme"];
export type TempChoice = EditorSettings["themeTemp"];
export type LayoutChoice = EditorSettings["uiMode"];
