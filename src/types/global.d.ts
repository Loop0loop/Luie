import type { RendererApi } from "../shared/api/index.js";

declare global {
  interface Window {
    api?: RendererApi;
  }

  const __APP_VERSION__: string;
  const __APP_NAME__: string;
}

export {};
