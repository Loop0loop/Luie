import type { FontPreset } from "../../../stores/editorStore";

export type SettingsTabId = "editor" | "appearance" | "shortcuts" | "recovery" | "sync" | "language";

export type ShortcutActionMeta = {
    id: string;
    labelKey: string;
};

export type ShortcutGroupMap = Record<string, ShortcutActionMeta[]>;

export type OptionalFontOption = {
    id: FontPreset;
    label: string;
    family: string;
    stack: string;
    pkg: string;
};
