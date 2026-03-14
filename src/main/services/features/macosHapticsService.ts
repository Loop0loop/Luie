import { app } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

type HapticsAddon = {
  alignment?: () => void;
};

const require = createRequire(import.meta.url);
const HAPTIC_THROTTLE_MS = 48;

class MacosHapticsService {
  private addon: HapticsAddon | null | undefined;
  private lastAlignmentAt = 0;

  private resolveAddonPath(): string {
    if (app.isPackaged) {
      return path.join(
        process.resourcesPath,
        "native",
        "haptics",
        "build",
        "Release",
        "luie_haptics.node",
      );
    }

    return path.resolve(
      process.cwd(),
      "native",
      "haptics",
      "build",
      "Release",
      "luie_haptics.node",
    );
  }

  private loadAddon(): HapticsAddon | null {
    if (this.addon !== undefined) {
      return this.addon;
    }

    if (process.platform !== "darwin") {
      this.addon = null;
      return this.addon;
    }

    const addonPath = this.resolveAddonPath();
    if (!existsSync(addonPath)) {
      this.addon = null;
      return this.addon;
    }

    try {
      this.addon = require(addonPath) as HapticsAddon;
    } catch {
      this.addon = null;
    }

    return this.addon;
  }

  performAlignmentFeedback(): boolean {
    if (process.platform !== "darwin") {
      return false;
    }

    const now = Date.now();
    if (now - this.lastAlignmentAt < HAPTIC_THROTTLE_MS) {
      return false;
    }

    const addon = this.loadAddon();
    if (!addon?.alignment) {
      return false;
    }

    try {
      addon.alignment();
      this.lastAlignmentAt = now;
      return true;
    } catch {
      return false;
    }
  }
}

export const macosHapticsService = new MacosHapticsService();
