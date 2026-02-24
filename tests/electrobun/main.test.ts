import { describe, expect, it, vi } from "vitest";
import { startElectrobunShell } from "../../src/electrobun/main.js";

describe("startElectrobunShell", () => {
  it("runs lifecycle in bootstrap order and handles initial deep link", () => {
    const steps: string[] = [];
    const handleDeepLinkUrl = vi.fn(async (_url: string) => {
      steps.push("handleDeepLinkUrl");
      return true;
    });

    startElectrobunShell({
      argv: ["app", "luie://auth/callback?code=1"],
      lifecycle: {
        registerProtocol: () => steps.push("registerProtocol"),
        registerSingleInstance: () => {
          steps.push("registerSingleInstance");
          return true;
        },
        initializeSync: () => steps.push("initializeSync"),
        registerAppReady: () => steps.push("registerAppReady"),
        registerShutdownHandlers: () => steps.push("registerShutdownHandlers"),
      },
      deepLink: {
        extractAuthCallbackUrl: (_argv: string[]) => {
          steps.push("extractAuthCallbackUrl");
          return "luie://auth/callback?code=1";
        },
        handleDeepLinkUrl,
      },
    });

    expect(steps).toEqual([
      "registerProtocol",
      "registerSingleInstance",
      "initializeSync",
      "extractAuthCallbackUrl",
      "handleDeepLinkUrl",
      "registerAppReady",
      "registerShutdownHandlers",
    ]);
    expect(handleDeepLinkUrl).toHaveBeenCalledWith("luie://auth/callback?code=1");
  });

  it("stops when single-instance lock fails", () => {
    const steps: string[] = [];

    startElectrobunShell({
      argv: ["app"],
      lifecycle: {
        registerProtocol: () => steps.push("registerProtocol"),
        registerSingleInstance: () => {
          steps.push("registerSingleInstance");
          return false;
        },
        initializeSync: () => steps.push("initializeSync"),
        registerAppReady: () => steps.push("registerAppReady"),
        registerShutdownHandlers: () => steps.push("registerShutdownHandlers"),
      },
      deepLink: {
        extractAuthCallbackUrl: (_argv: string[]) => {
          steps.push("extractAuthCallbackUrl");
          return null;
        },
        handleDeepLinkUrl: async (_url: string) => {
          steps.push("handleDeepLinkUrl");
          return false;
        },
      },
    });

    expect(steps).toEqual(["registerProtocol", "registerSingleInstance"]);
  });
});
