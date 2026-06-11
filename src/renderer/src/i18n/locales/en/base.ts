import { enBaseCore } from "./base/core";
import { enBaseSettings } from "./base/Settings";
import { enBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { enBaseResearch } from "./base/Research";
import { enBaseEditor } from "./base/Editor";
import { enBaseAnalysis } from "./base/Analysis";

export const enBase = {
  ...enBaseCore,
  settings: {
    ...enBaseSettings.settings,
    ...enBaseSettingsAdvanced.settings,
  },
  ...enBaseResearch,
  ...enBaseEditor,
  ...enBaseAnalysis,
} as const;
