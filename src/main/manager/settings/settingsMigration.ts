import { access } from "node:fs/promises";
import Store from "electron-store";
import type { AppSettings } from "../../../shared/types/index.js";
import {
  DEFAULT_MENU_BAR_MODE,
  SETTINGS_STORE_APP_DIR_NAME,
  SETTINGS_STORE_BASENAME,
  SETTINGS_STORE_FILE_NAME,
  getDefaultSettings,
} from "./settingsDefaults.js";

type LoggerLike = {
  info: (message: string, details?: unknown) => void;
  error: (message: string, details?: unknown) => void;
};

type SettingsStore = Store<AppSettings>;

export const resolveLegacySettingsPaths = (
  settingsPath: string,
): {
  legacyCwd: string;
  legacyFile: string;
} => {
  const legacyCwd = `${settingsPath}/${SETTINGS_STORE_APP_DIR_NAME}/${SETTINGS_STORE_BASENAME}`;
  const legacyFile = `${legacyCwd}/${SETTINGS_STORE_FILE_NAME}`;
  return { legacyCwd, legacyFile };
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

export const migrateLegacySettingsIfNeeded = async (
  store: SettingsStore,
  legacyCwd: string,
  legacyFile: string,
  logger: LoggerLike,
): Promise<void> => {
  const hasLegacy = await pathExists(legacyFile);
  const hasCurrent = await pathExists(store.path);

  if (!hasLegacy || hasCurrent) {
    return;
  }

  try {
    const legacyStore = new Store<AppSettings>({
      name: SETTINGS_STORE_BASENAME,
      defaults: getDefaultSettings(),
      cwd: legacyCwd,
      fileExtension: "json",
    });
    store.set(legacyStore.store);
    logger.info("Settings migrated from legacy path", {
      from: legacyStore.path,
      to: store.path,
    });
  } catch (error) {
    logger.error("Failed to migrate legacy settings", error);
  }
};

export const migrateLegacyLlmSettings = (
  store: SettingsStore,
  logger: LoggerLike,
): void => {
  const llm = store.get("llm") as Record<string, unknown> | undefined;
  if (!llm) return;
  // Already migrated — ollama key exists
  if ("ollama" in llm) return;
  // Old llamacpp-era format detected. Preserve ragTemperature/ragMaxTokens; drop the rest.
  const ragTemperature =
    typeof llm.ragTemperature === "number" ? llm.ragTemperature : undefined;
  const ragMaxTokens =
    typeof llm.ragMaxTokens === "number" ? llm.ragMaxTokens : undefined;
  const migrated: AppSettings["llm"] = {
    ollama: { baseUrl: "http://localhost:11434", chatModel: "" },
    ...(ragTemperature !== undefined ? { ragTemperature } : {}),
    ...(ragMaxTokens !== undefined ? { ragMaxTokens } : {}),
  };
  store.set("llm", migrated);
  logger.info("Migrated legacy LLM settings to Ollama format", {
    ragTemperature,
    ragMaxTokens,
  });
};

export const migrateLegacyWindowSettings = (store: SettingsStore): void => {
  const current = store.store as AppSettings & {
    titleBarMode?: "hidden" | "visible";
  };

  if (!current.menuBarMode) {
    store.set("menuBarMode", DEFAULT_MENU_BAR_MODE);
  }

  if ("titleBarMode" in current) {
    const { titleBarMode: _legacyTitleBarMode, ...next } = current;
    store.set(next);
  }
};

export const migrateSettingsStore = (
  input: {
    store: SettingsStore;
    legacyCwd: string;
    legacyFile: string;
    logger: LoggerLike;
  },
): Promise<void> =>
  migrateLegacySettingsIfNeeded(
    input.store,
    input.legacyCwd,
    input.legacyFile,
    input.logger,
  ).then(() => {
    migrateLegacyWindowSettings(input.store);
    migrateLegacyLlmSettings(input.store, input.logger);
  });
