import { enBaseCore } from "./base/core";
import { enBaseSettings } from "./base/settings";
import { enBaseSettingsAdvanced } from "./base/settingsAdvanced";
import { enBaseResearch } from "./base/research";
import { enBaseEditor } from "./base/editor";

export const enBase = {
  ...enBaseCore,
  settings: {
    ...enBaseSettings.settings,
    ...enBaseSettingsAdvanced.settings,
  },
  ...enBaseResearch,
  ...enBaseEditor,
} as const;
