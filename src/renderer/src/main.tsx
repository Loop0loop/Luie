import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-jp";
import { initI18n } from "./i18n";
import { setupRenderer } from "./setup";
import App from "./App";
import { GlobalErrorBoundary } from "./components/common/GlobalErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import { DialogProvider } from "./components/common/DialogProvider";
import "./styles/global.css";

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
