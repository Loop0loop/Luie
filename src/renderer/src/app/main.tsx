import React from "react";
import ReactDOM from "react-dom/client";
import { initI18n } from "@renderer/i18n";
import { setupRenderer } from "@renderer/app/setup";
import App from "@renderer/app/App";
import { GlobalErrorBoundary } from "@renderer/shared/error-boundaries/GlobalErrorBoundary";
import { ToastProvider } from "@shared/ui/Toast";
import { DialogProvider } from "@shared/ui/DialogProvider";
import { OBSERVABILITY_EVENT_SCHEMA_VERSION } from "@shared/constants";
import { createPerformanceTimer, emitOperationalLog } from "@shared/logger";
import "@renderer/styles/global.css";

const rendererStartupStartedAt = performance.now();
const root = ReactDOM.createRoot(document.getElementById("root")!);
const i18nPromise = initI18n();
const setupRendererPromise = setupRenderer();

const startupLogger = window.api?.logger ?? null;

const logStartup = (message: string, data?: Record<string, unknown>) => {
  emitOperationalLog(startupLogger, "info", message, {
    schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
    domain: "performance",
    event: message,
    scope: "renderer-startup",
    ...(data ?? {}),
  });
};

const elapsedMs = () =>
  Number((performance.now() - rendererStartupStartedAt).toFixed(1));

const logAsyncTask = (label: string, promise: Promise<unknown>) => {
  const timer = createPerformanceTimer({
    scope: "renderer-startup",
    event: `renderer.startup.${label}`,
  });
  void promise
    .then(() => {
      timer.complete(startupLogger, {
        elapsedMs: elapsedMs(),
      });
    })
    .catch((error) => {
      timer.fail(startupLogger, error, {
        elapsedMs: elapsedMs(),
      });
    });
};

const renderApp = () => {
  root.render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <ToastProvider>
          <DialogProvider>
            <App />
          </DialogProvider>
        </ToastProvider>
      </GlobalErrorBoundary>
    </React.StrictMode>,
  );

  logStartup("Renderer root mounted", { elapsedMs: elapsedMs() });

  requestAnimationFrame(() => {
    logStartup("Renderer first frame painted", { elapsedMs: elapsedMs() });
  });
};

void Promise.allSettled([i18nPromise, setupRendererPromise]).then((results) => {
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const label = index === 0 ? "initI18n" : "setupRenderer";
    emitOperationalLog(startupLogger, "warn", `Renderer ${label} failed`, {
      schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
      domain: "performance",
      event: `renderer.startup.${label}.failed`,
      scope: "renderer-startup",
      elapsedMs: elapsedMs(),
      error: String(result.reason),
    });
  });
  renderApp();
});

logAsyncTask("setupRenderer", setupRendererPromise);
logAsyncTask("initI18n", i18nPromise);
