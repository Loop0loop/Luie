import { koBaseCore } from "./base/core";
import { koBaseSettings } from "./base/Settings";
import { koBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { koBaseResearch } from "./base/Research";
import { koBaseEditor } from "./base/Editor";

export const koBase = {
  ...koBaseCore,
  settings: {
    ...koBaseSettings.settings,
    ...koBaseSettingsAdvanced.settings,
  },
  ...koBaseResearch,
  ...koBaseEditor,
} as const;
