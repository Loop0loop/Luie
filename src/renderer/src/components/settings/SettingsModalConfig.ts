import { Command, Type, Layout, BookOpen, FileText, Keyboard, Monitor, RotateCcw, Globe } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SettingsTabId } from "./SettingsModalSections";

export const SETTINGS_TABS: Array<{ id: SettingsTabId; labelKey: string; icon: LucideIcon }> = [
  { id: "editor", labelKey: "settings.sidebar.editor", icon: Type },
  { id: "appearance", labelKey: "settings.sidebar.appearance", icon: Monitor },
  { id: "shortcuts", labelKey: "settings.sidebar.shortcuts", icon: Keyboard },
  { id: "recovery", labelKey: "settings.sidebar.recovery", icon: RotateCcw },
  { id: "language", labelKey: "settings.sidebar.language", icon: Globe },
];

export const SHORTCUT_GROUP_ICON_MAP: Record<string, LucideIcon> = {
  app: Command,
  chapter: FileText,
  view: Layout,
  research: BookOpen,
  editor: Type,
  other: Keyboard,
};

