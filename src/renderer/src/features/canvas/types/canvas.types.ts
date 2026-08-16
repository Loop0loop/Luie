export type CanvasMode =
  | "flow-map"
  | "scene-board"
  | "timeline"
  | "character-map"
  | "memory-map";

import type { CANVAS_AVAILABLE_MODES as _CANVAS_AVAILABLE_MODES } from "../constants/i18n";
import type { MainView } from "@renderer/features/workspace/stores/uiStore.types";
export { CANVAS_AVAILABLE_MODES } from "../constants/i18n";

export type CanvasAvailableMode = (typeof _CANVAS_AVAILABLE_MODES)[number];



export type CanvasRange =
  | "current-chapter"
  | "three-chapters"
  | "current-part"
  | "whole-project";

export type CanvasLayer =
  | "scene"
  | "character"
  | "event"
  | "memo"
  | "ai-hint";

export type CanvasActivityPanel =
  | "explorer"
  | "graph"
  | "canvas"
  | "memory"
  | "search";

export type CanvasScope =
  | { kind: "single-chapter"; chapterId: string }
  | { kind: "three-chapters"; centerChapterId: string }
  | { kind: "current-part"; partId: string }
  | { kind: "whole-project"; projectId: string };

export type CanvasViewport = {
  zoom: number;
  pan: { x: number; y: number };
};

export type CanvasSelection =
  | { kind: "none" }
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

export type CanvasEntityPreview =
  | { kind: "character"; id: string }
  | { kind: "event"; id: string }
  | { kind: "faction"; id: string }
  | { kind: "memo"; id: string };

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "canvas" | "folder";
  children?: FileNode[];
  readOnly?: boolean;
  focusIds?: string[];
  canvasFileId?: string;
  mainView?: MainView;
}
