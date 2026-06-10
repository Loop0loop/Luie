import { jaBaseCore } from "./base/core";
import { jaBaseSettings } from "./base/Settings";
import { jaBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { jaBaseResearch } from "./base/Research";
import { jaBaseEditor } from "./base/Editor";

export const jaBase = {
  ...jaBaseCore,
  settings: {
    ...jaBaseSettings.settings,
    ...jaBaseSettingsAdvanced.settings,
  },
  ...jaBaseResearch,
  ...jaBaseEditor,
} as const;
