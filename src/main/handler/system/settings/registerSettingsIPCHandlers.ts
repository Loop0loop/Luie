import { registerIpcHandlers } from "../../core/ipcRegistrar.js";
import type { LoggerLike } from "../../core/types.js";
import {
  createLlmfitEmbeddingHandlers,
  createModelDownloadHandlers,
  createSettingsCoreHandlers,
  createSettingsLlmHandlers,
} from "./index.js";

export function registerSettingsIPCHandlers(logger: LoggerLike): void {
  registerIpcHandlers(logger, [
    ...createSettingsCoreHandlers(),
    ...createSettingsLlmHandlers(),
    ...createModelDownloadHandlers(),
    ...createLlmfitEmbeddingHandlers(),
  ]);
}
