import React from "react";
import ReactDOM from "react-dom/client";
import { startRendererFontLoading } from "@renderer/app/fontLoader";
import "./styles/global.css";
import OAuthResultPage from "@renderer/features/auth/components/OAuthResultPage";

const root = ReactDOM.createRoot(document.getElementById("root")!);

startRendererFontLoading();

root.render(
  <React.StrictMode>
    <OAuthResultPage />
  </React.StrictMode>,
);
