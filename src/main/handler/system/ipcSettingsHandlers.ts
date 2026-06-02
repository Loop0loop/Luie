import { registerIpcHandlers } from "../core/ipcRegistrar.js";
import type { LoggerLike } from "../core/types.js";
import { createLlmfitEmbeddingHandlers } from "./ipcLlmfitEmbeddingHandlers.js";
import { createModelDownloadHandlers } from "./ipcModelDownloadHandlers.js";
import { createSettingsCoreHandlers } from "./ipcSettingsCoreHandlers.js";
import { createSettingsLlmHandlers } from "./ipcSettingsLlmHandlers.js";

export function registerSettingsIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    ...createSettingsCoreHandlers(),
    ...createSettingsLlmHandlers(),
    ...createModelDownloadHandlers(),
    ...createLlmfitEmbeddingHandlers(),
  ]);
}
