import { app } from "electron";

export const isTestEnv = () =>
  process.env.VITEST === "true" || process.env.NODE_ENV === "test";

const isRendererProdForced = () => process.env.LUIE_RENDERER_PROD === "1";

export const isDevEnv = () => !app.isPackaged && !isTestEnv();

export const isProdEnv = () => app.isPackaged;

export const isRendererDevEnv = () =>
  !app.isPackaged && !isTestEnv() && !isRendererProdForced();

export const isRendererProdEnv = () => app.isPackaged || isRendererProdForced();
