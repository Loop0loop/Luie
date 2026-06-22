export type SettingsTabId =
  | "editor"
  | "appearance"
  | "shortcuts"
  | "recovery"
  | "sync"
  | "language"
  | "model";

export type ShortcutActionMeta = {
  id: string;
  labelKey: string;
};

export type ShortcutGroupMap = Record<string, ShortcutActionMeta[]>;
