import type { IPCResponse } from "@shared/ipc/index.js";
import type { RendererApi } from "./rendererApi";

const PRELOAD_UNAVAILABLE_CODE = "PRELOAD_API_UNAVAILABLE";
const PRELOAD_UNAVAILABLE_MESSAGE =
  "Preload API is unavailable. Restart the app and verify the preload build.";
const EVENT_SUBSCRIPTION_METHODS = new Set([
  "onBootstrapStatus",
  "onUpdateState",
  "onStream",
  "onError",
  "onStatusChanged",
  "onAuthResult",
  "onQuitPhase",
]);
const VOID_METHODS = new Set(["setDirty"]);

let apiClient: RendererApi | null = null;
let preloadWarningLogged = false;

const getBrowserApi = (): RendererApi | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.api ?? null;
};

const resolvePath = (source: unknown, path: string[]): unknown => {
  let cursor: unknown = source;
  for (const segment of path) {
    if (
      !cursor ||
      (typeof cursor !== "object" && typeof cursor !== "function")
    ) {
      return undefined;
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

const createUnavailableResponse = <T = unknown>(): IPCResponse<T> => ({
  success: false,
  error: {
    code: PRELOAD_UNAVAILABLE_CODE,
    message: PRELOAD_UNAVAILABLE_MESSAGE,
  },
  meta: {
    timestamp: new Date().toISOString(),
    channel: "renderer:api",
  },
});

const markPreloadUnavailable = (): void => {
  if (preloadWarningLogged) {
    return;
  }
  preloadWarningLogged = true;
};

const createDeferredApiNode = (path: string[]): unknown =>
  new Proxy(function deferredApiMethod() {}, {
    get: (_target, prop) => {
      if (prop === "then") {
        return undefined;
      }
      if (prop === Symbol.toStringTag) {
        return "DeferredRendererApi";
      }
      if (typeof prop === "symbol") {
        return undefined;
      }
      return createDeferredApiNode([...path, String(prop)]);
    },
    apply: (_target, _thisArg, args: unknown[]) => {
      const source = apiClient ?? getBrowserApi();
      const resolved = source ? resolvePath(source, path) : undefined;

      if (typeof resolved === "function") {
        return resolved(...args);
      }

      const methodName = path[path.length - 1] ?? "";
      if (EVENT_SUBSCRIPTION_METHODS.has(methodName)) {
        return () => undefined;
      }
      if (VOID_METHODS.has(methodName)) {
        return undefined;
      }

      markPreloadUnavailable();
      return Promise.resolve(createUnavailableResponse());
    },
  });

const deferredApiClient = createDeferredApiNode([]) as RendererApi;

export function setApiClient(client: RendererApi) {
  apiClient = client;
}

export function getApiClient(): RendererApi {
  return apiClient ?? getBrowserApi() ?? deferredApiClient;
}

export const api = getApiClient();
