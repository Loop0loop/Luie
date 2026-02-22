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

const root = ReactDOM.createRoot(document.getElementById("root")!);

Promise.allSettled([setupRenderer(), initI18n()]).finally(() => {
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
});
