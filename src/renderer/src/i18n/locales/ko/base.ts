import { koBaseCore } from "./base/core";
import { koBaseSettings } from "./base/settings";
import { koBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { koBaseResearch } from "./base/research";
import { koBaseEditor } from "./base/editor";

export const koBase = {
  ...koBaseCore,
  settings: {
    ...koBaseSettings.settings,
    ...koBaseSettingsAdvanced.settings,
  },
  ...koBaseResearch,
  ...koBaseEditor,
} as const;
