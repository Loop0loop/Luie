import { Command, Type, Layout, BookOpen, FileText, Keyboard, Monitor, RotateCcw, Globe, Cloud } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SettingsTabId } from "./SettingsModalSections";
import type { FontPreset } from "../../../../shared/types";

export const SETTINGS_TABS: Array<{ id: SettingsTabId; labelKey: string; icon: LucideIcon }> = [
  { id: "editor", labelKey: "settings.sidebar.editor", icon: Type },
  { id: "appearance", labelKey: "settings.sidebar.appearance", icon: Monitor },
  { id: "shortcuts", labelKey: "settings.sidebar.shortcuts", icon: Keyboard },
  { id: "recovery", labelKey: "settings.sidebar.recovery", icon: RotateCcw },
  { id: "sync", labelKey: "settings.sidebar.sync", icon: Cloud },
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

export type OptionalFontConfig = {
  id: FontPreset;
  labelKey: string;
  family: string;
  stack: string;
  pkg: string;
};

export const OPTIONAL_FONT_OPTIONS: OptionalFontConfig[] = [
  {
    id: "lora",
    labelKey: "settings.optionalFonts.lora",
    family: "Lora Variable",
    stack: "\"Lora Variable\", \"Lora\", var(--font-serif)",
    pkg: "lora",
  },
  {
    id: "bitter",
    labelKey: "settings.optionalFonts.bitter",
    family: "Bitter Variable",
    stack: "\"Bitter Variable\", \"Bitter\", var(--font-serif)",
    pkg: "bitter",
  },
  {
    id: "source-serif",
    labelKey: "settings.optionalFonts.sourceSerif",
    family: "Source Serif 4 Variable",
    stack: "\"Source Serif 4 Variable\", \"Source Serif 4\", var(--font-serif)",
    pkg: "source-serif-4",
  },
  {
    id: "montserrat",
    labelKey: "settings.optionalFonts.montserrat",
    family: "Montserrat Variable",
    stack: "\"Montserrat Variable\", \"Montserrat\", var(--font-sans)",
    pkg: "montserrat",
  },
  {
    id: "nunito-sans",
    labelKey: "settings.optionalFonts.nunitoSans",
    family: "Nunito Sans Variable",
    stack: "\"Nunito Sans Variable\", \"Nunito Sans\", var(--font-sans)",
    pkg: "nunito-sans",
  },
  {
    id: "victor-mono",
    labelKey: "settings.optionalFonts.victorMono",
    family: "Victor Mono Variable",
    stack: "\"Victor Mono Variable\", \"Victor Mono\", var(--font-mono)",
    pkg: "victor-mono",
  },
];
