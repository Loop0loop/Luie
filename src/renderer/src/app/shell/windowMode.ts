import { useEffect, useState } from "react";

export type WindowMode =
  | "app"
  | "export"
  | "oauth-result"
  | "world-graph"
  | "startup-wizard";

const getWindowMode = (): WindowMode => {
  if (typeof window === "undefined") return "app";
  if (window.location.hash === "#export") return "export";
  if (window.location.hash === "#world-graph") return "world-graph";
  if (window.location.hash === "#startup-wizard") return "startup-wizard";
  if (window.location.hash.startsWith("#auth-result")) return "oauth-result";
  return "app";
};

export const useWindowMode = (): WindowMode => {
  const [windowMode, setWindowMode] = useState<WindowMode>(getWindowMode);

  useEffect(() => {
    const checkHash = () => {
      setWindowMode(getWindowMode());
    };
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  return windowMode;
};
