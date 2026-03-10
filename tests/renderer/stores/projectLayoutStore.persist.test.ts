import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEY_PROJECT_LAYOUT } from "../../../src/shared/constants/index.js";

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

const loadProjectLayoutStore = async (persistedState?: unknown) => {
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
      STORAGE_KEY_PROJECT_LAYOUT,
      JSON.stringify({ state: persistedState, version: 0 }),
    );
  }

  const module =
    await import("../../../src/renderer/src/features/workspace/stores/projectLayoutStore.js");

  return { module, warn };
};

describe("projectLayoutStore persist rehydrate", () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it("falls back to defaults when persisted payload is malformed", async () => {
    const { module, warn } = await loadProjectLayoutStore({
      byProject: {
        "project-1": {
          main: {
            sidebarOpen: false,
            contextOpen: false,
          },
          docs: {
            sidebarOpen: false,
            binderBarOpen: false,
            rightTab: "analysis",
          },
          scrivener: {
            sidebarOpen: false,
            inspectorOpen: false,
            sections: {
              manuscript: true,
              characters: true,
              world: false,
              scrap: false,
              snapshots: false,
              analysis: false,
              trash: false,
            },
          },
        },
      },
      extra: true,
    });

    const state = module.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-1");
    expect(state.docs.rightTab).toBeNull();
    expect(state.main.sidebarOpen).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("rehydrates valid per-project layout state", async () => {
    const { module, warn } = await loadProjectLayoutStore({
      byProject: {
        "project-1": {
          main: {
            sidebarOpen: false,
            contextOpen: true,
          },
          docs: {
            sidebarOpen: false,
            binderBarOpen: true,
            rightTab: "world",
          },
          scrivener: {
            sidebarOpen: true,
            inspectorOpen: false,
            sections: {
              manuscript: true,
              characters: false,
              world: true,
              scrap: false,
              snapshots: false,
              analysis: true,
              trash: false,
            },
          },
        },
      },
    });

    const state = module.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-1");
    expect(state.main.sidebarOpen).toBe(false);
    expect(state.docs.rightTab).toBe("world");
    expect(state.scrivener.sections.analysis).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });
});
