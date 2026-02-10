import type { ShortcutAction } from "../types/index.js";

export const SHORTCUT_ACTIONS: Array<{ id: ShortcutAction; labelKey: string }> = [
  { id: "app.openSettings", labelKey: "settings.shortcuts.openSettings" },
  { id: "chapter.new", labelKey: "settings.shortcuts.newChapter" },
  { id: "chapter.save", labelKey: "settings.shortcuts.saveChapter" },
  { id: "view.toggleSidebar", labelKey: "settings.shortcuts.toggleSidebar" },
  { id: "view.toggleContextPanel", labelKey: "settings.shortcuts.toggleContext" },
];


