import * as path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const resolveUserDataPath = (): string => {
  const fromEnv = process.env.LUIE_USER_DATA_PATH?.trim();
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  try {
    const electron = require("electron") as { app?: { getPath?: (name: string) => string } };
    const fromApp = electron.app?.getPath?.("userData");
    if (fromApp && fromApp.length > 0) return fromApp;
  } catch {
    // ignore and fallback
  }
  return path.join(process.cwd(), ".luie-user-data");
};
