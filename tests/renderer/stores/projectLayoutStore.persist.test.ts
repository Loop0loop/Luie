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

const loadProjectLayoutStore = async (
  persistedState?: unknown,
  persistedStorageVersion = 0,
) => {
  vi.resetModules();
  memoryStorage.clear();
  const warn = vi.fn().mockResolvedValue({ success: true });
  const info = vi.fn().mockResolvedValue({ success: true });

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
          info,
        },
      },
    },
    configurable: true,
    writable: true,
  });

  if (persistedState !== undefined) {
    memoryStorage.setItem(
      STORAGE_KEY_PROJECT_LAYOUT,
      JSON.stringify({ state: persistedState, version: persistedStorageVersion }),
    );
  }

  const module =
    await import("../../../src/renderer/src/features/workspace/stores/projectLayoutStore.js");

  return { module, warn, info };
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
              events: false,
              factions: false,
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
              events: true,
              factions: false,
              world: true,
              scrap: false,
              snapshots: false,
              analysis: true,
              trash: false,
            },
          },
          editor: {
            activeChapterId: null,
            scrollYByChapter: {},
          },
          workspace: {
            panels: [
              {
                id: "research-character",
                content: {
                  type: "research",
                  tab: "character",
                },
                size: 64,
              },
              {
                id: "research-faction",
                content: {
                  type: "research",
                  tab: "faction",
                },
                size: 42,
              },
            ],
            researchPanelSizes: {
              character: 64,
              event: 51,
              faction: 42,
              world: 57,
              scrap: 46,
              analysis: 59,
            },
          },
          sidebarWidths: {
            characterSidebar: 336,
            docsBinder: 312,
            factionSidebar: 348,
            docsWorld: 640,
          },
          layoutSurfaceRatios: {
            "docs.sidebar": 21,
            "docs.panel.character": 39,
            "docs.panel.faction": 41,
            "docs.panel.world": 42,
          },
        },
      },
    });

    const state = module.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-1");
    expect(module.useProjectLayoutStore.getState().hasHydrated).toBe(true);
    expect(state.main.sidebarOpen).toBe(false);
    expect(state.docs.rightTab).toBe("world");
    expect(state.scrivener.sections.events).toBe(true);
    expect(state.scrivener.sections.analysis).toBe(true);
    expect(state.sidebarWidths.characterSidebar).toBe(336);
    expect(state.sidebarWidths.docsBinder).toBe(312);
    expect(state.sidebarWidths.factionSidebar).toBe(348);
    expect(state.layoutSurfaceRatios["docs.panel.character"]).toBe(39);
    expect(state.layoutSurfaceRatios["docs.panel.faction"]).toBe(41);
    expect(state.layoutSurfaceRatios["docs.panel.world"]).toBe(42);
    expect(state.workspace.panels).toEqual([
      {
        id: "research-character",
        content: {
          type: "research",
          tab: "character",
        },
        size: 64,
      },
      {
        id: "research-faction",
        content: {
          type: "research",
          tab: "faction",
        },
        size: 42,
      },
    ]);
    expect(state.workspace.researchPanelSizes).toEqual({
      character: 64,
      event: 51,
      faction: 42,
      world: 57,
      scrap: 46,
      analysis: 59,
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to defaults when persisted payload comes from a future version", async () => {
    const { module, warn } = await loadProjectLayoutStore(
      {
        schemaVersion: 99,
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
                characters: false,
                events: false,
                factions: false,
                world: false,
                scrap: false,
                snapshots: false,
                analysis: false,
                trash: false,
              },
            },
          },
        },
      },
      99,
    );

    const state = module.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-1");
    expect(state.main.sidebarOpen).toBe(true);
    expect(state.docs.rightTab).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });
});
