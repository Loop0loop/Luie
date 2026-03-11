import React from "react";
import ReactDOM from "react-dom/client";
import { initI18n } from "@renderer/i18n";
import { startRendererFontLoading } from "@renderer/app/fontLoader";
import { setupRenderer } from "@renderer/app/setup";
import App from "@renderer/app/App";
import { GlobalErrorBoundary } from "@renderer/shared/error-boundaries/GlobalErrorBoundary";
import { ToastProvider } from "@shared/ui/Toast";
import { DialogProvider } from "@shared/ui/DialogProvider";
import {
  OBSERVABILITY_EVENT_SCHEMA_VERSION,
} from "@shared/constants";
import {
  createPerformanceTimer,
  emitOperationalLog,
} from "@shared/logger";
import "@renderer/styles/global.css";

const rendererStartupStartedAt = performance.now();
const root = ReactDOM.createRoot(document.getElementById("root")!);
const i18nPromise = initI18n();

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

const elapsedMs = () => Number((performance.now() - rendererStartupStartedAt).toFixed(1));

const runBackgroundTask = (label: string, task: () => Promise<unknown>) => {
  const timer = createPerformanceTimer({
    scope: "renderer-startup",
    event: `renderer.startup.${label}`,
  });
  void task()
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

root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ToastProvider>
        <DialogProvider>
          <App />
        </DialogProvider>
      </ToastProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);

startRendererFontLoading(i18nPromise);

logStartup("Renderer root mounted", { elapsedMs: elapsedMs() });

requestAnimationFrame(() => {
  logStartup("Renderer first frame painted", { elapsedMs: elapsedMs() });
});

runBackgroundTask("setupRenderer", setupRenderer);
runBackgroundTask("initI18n", () => i18nPromise);
