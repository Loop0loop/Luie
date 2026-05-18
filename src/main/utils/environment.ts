import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const resolveIsPackaged = (): boolean => {
  if (process.type !== "browser") {
    return process.env.NODE_ENV === "production";
  }
  try {
    const electron = require("electron") as { app?: { isPackaged?: boolean } };
    return Boolean(electron.app?.isPackaged);
  } catch {
    return process.env.NODE_ENV === "production";
  }
};

export const isTestEnv = () =>
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export const isDevEnv = () => !resolveIsPackaged() && !isTestEnv();

export const isProdEnv = () => resolveIsPackaged();
