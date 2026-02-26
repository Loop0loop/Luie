import type { RendererApi } from "../shared/api/index.js";

declare global {
  interface Window {
    api?: RendererApi;
  }
}

export {};
