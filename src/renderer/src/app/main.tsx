import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-jp";
import { initI18n } from "@renderer/i18n";
import { setupRenderer } from "@renderer/app/setup";
import App from "@renderer/app/App";
import { GlobalErrorBoundary } from "@shared/ui/GlobalErrorBoundary";
import { ToastProvider } from "@shared/ui/Toast";
import { DialogProvider } from "@shared/ui/DialogProvider";
import "@renderer/styles/global.css";

const rendererStartupStartedAt = performance.now();
const root = ReactDOM.createRoot(document.getElementById("root")!);

const logStartup = (message: string, data?: Record<string, unknown>) => {
  const request = window.api?.logger?.info?.(message, data);
  if (!request) return;
  void request.catch(() => undefined);
};

const elapsedMs = () => Number((performance.now() - rendererStartupStartedAt).toFixed(1));

const runBackgroundTask = (label: string, task: () => Promise<unknown>) => {
  void task()
    .then(() => {
      logStartup(`Renderer startup task completed: ${label}`, {
        elapsedMs: elapsedMs(),
      });
    })
    .catch((error) => {
      logStartup(`Renderer startup task failed: ${label}`, {
        elapsedMs: elapsedMs(),
        error: error instanceof Error ? error.message : String(error),
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

logStartup("Renderer root mounted", { elapsedMs: elapsedMs() });

requestAnimationFrame(() => {
  logStartup("Renderer first frame painted", { elapsedMs: elapsedMs() });
});

runBackgroundTask("setupRenderer", setupRenderer);
runBackgroundTask("initI18n", initI18n);
