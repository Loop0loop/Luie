import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-kr";
import "@fontsource-variable/noto-sans-jp";
import "./styles/global.css";
import OAuthResultPage from "@renderer/features/auth/components/OAuthResultPage";

const root = ReactDOM.createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <OAuthResultPage />
  </React.StrictMode>,
);
