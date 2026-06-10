import { enBaseCore } from "./base/core";
import { enBaseSettings } from "./base/Settings";
import { enBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { enBaseResearch } from "./base/Research";
import { enBaseEditor } from "./base/Editor";

export const enBase = {
  ...enBaseCore,
  settings: {
    ...enBaseSettings.settings,
    ...enBaseSettingsAdvanced.settings,
  },
  ...enBaseResearch,
  ...enBaseEditor,
} as const;
