import type { SettingsManager } from "../../../manager/settingsManager.js";

export const loadSettingsManager = (() => {
  let cached: Promise<{ settingsManager: SettingsManager }> | null = null;
  return async () => {
    if (!cached) {
      cached = import("../../../manager/settingsManager.js") as Promise<{
        settingsManager: SettingsManager;
      }>;
    }
    const module = await cached;
    return module.settingsManager;
  };
})();
