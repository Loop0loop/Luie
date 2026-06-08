import { jaBaseCore } from "./base/core";
import { jaBaseSettings } from "./base/settings";
import { jaBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { jaBaseResearch } from "./base/research";
import { jaBaseEditor } from "./base/editor";

export const jaBase = {
  ...jaBaseCore,
  settings: {
    ...jaBaseSettings.settings,
    ...jaBaseSettingsAdvanced.settings,
  },
  ...jaBaseResearch,
  ...jaBaseEditor,
} as const;
