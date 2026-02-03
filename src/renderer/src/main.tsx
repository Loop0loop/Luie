import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-jp";
import App from "./App";
import { GlobalErrorBoundary } from "./components/common/GlobalErrorBoundary";
import { ToastProvider } from "./components/common/Toast";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
