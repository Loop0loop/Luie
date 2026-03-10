import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_UI_VIEW,
  STORAGE_KEY_UI,
} from "../../../src/shared/constants/index.js";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  readonly length: number;
};

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  get length(): number {
    return this.data.size;
  }
}

const memoryStorage = new MemoryStorage();

const loadUiStore = async (persistedState?: unknown) => {
  vi.resetModules();
  memoryStorage.clear();
  const warn = vi.fn().mockResolvedValue({ success: true });

  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: {
      api: {
        logger: {
          warn,
        },
      },
    },
    configurable: true,
    writable: true,
  });

  if (persistedState !== undefined) {
    memoryStorage.setItem(
      STORAGE_KEY_UI,
      JSON.stringify({ state: persistedState, version: 0 }),
    );
  }

  const module =
    await import("../../../src/renderer/src/features/workspace/stores/uiStore.js");

  return { module, warn };
};

describe("uiStore persist rehydrate", () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it("falls back to defaults when persisted payload is malformed", async () => {
    const { module, warn } = await loadUiStore({
      view: "editor",
      extra: true,
    });

    expect(module.useUIStore.getState().view).toBe(DEFAULT_UI_VIEW);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rehydrates valid persisted state", async () => {
    const { module, warn } = await loadUiStore({
      view: "editor",
      contextTab: "characters",
      docsRightTab: "world",
      sidebarWidths: {
        mainSidebar: 288,
        docsWorld: 360,
      },
      regions: {
        leftSidebar: {
          open: false,
          widthPx: 288,
        },
        rightPanel: {
          open: true,
          activeTab: "world",
          widthByTab: {
            character: 300,
            event: 301,
            faction: 302,
            world: 360,
            scrap: 304,
            analysis: 305,
            snapshot: 306,
            trash: 307,
            editor: 308,
            export: 309,
          },
        },
        rightRail: {
          open: true,
        },
      },
    });

    const state = module.useUIStore.getState();
    expect(state.view).toBe("editor");
    expect(state.contextTab).toBe("characters");
    expect(state.regions.leftSidebar.widthPx).toBe(288);
    expect(state.regions.rightPanel.activeTab).toBe("world");
    expect(warn).not.toHaveBeenCalled();
  });
});
