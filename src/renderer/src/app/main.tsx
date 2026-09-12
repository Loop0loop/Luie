// 반드시 첫 import여야 한다: 위저드 부팅 시 persist 스토어들이 동기 rehydrate하기
// 전에 이전 세션 UI 상태를 지운다(평가 순서 = import 선언 순서).
import "@renderer/app/wizardFreshBoot";
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

// setupRenderer는 첫 await 전에 캐시 테마와 전역 핸들러를 동기 적용한다. 설정 IPC까지
// root mount를 막으면 첫 shell paint만 늦어지므로 i18n 완료만 기다린다.
void i18nPromise.then(
  () => renderApp(),
  (error) => {
    emitOperationalLog(startupLogger, "warn", "Renderer initI18n failed", {
      schemaVersion: OBSERVABILITY_EVENT_SCHEMA_VERSION,
      domain: "performance",
      event: "renderer.startup.initI18n.failed",
      scope: "renderer-startup",
      elapsedMs: elapsedMs(),
      error: String(error),
    });
    renderApp();
  },
);

logAsyncTask("setupRenderer", setupRendererPromise);
logAsyncTask("initI18n", i18nPromise);
