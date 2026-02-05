import { app } from "electron";

export const isTestEnv = () =>
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";

export const isDevEnv = () => !app.isPackaged && !isTestEnv();

export const isProdEnv = () => app.isPackaged;
