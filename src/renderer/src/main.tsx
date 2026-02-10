import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-jp";
import { initI18n } from "./i18n";
import App from "./App";
import { GlobalErrorBoundary } from "./components/common/GlobalErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import "./styles/global.css";

const root = ReactDOM.createRoot(document.getElementById("root")!);

initI18n().finally(() => {
  root.render(
    <React.StrictMode>
      <GlobalErrorBoundary>
        <ToastProvider>
          <App />
        </ToastProvider>
      </GlobalErrorBoundary>
    </React.StrictMode>
  );
});
