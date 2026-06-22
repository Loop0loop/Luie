import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type * as ProjectLayoutStoreModule from "../../../src/renderer/src/features/workspace/stores/projectLayoutStore.js";

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

let projectLayoutModule: typeof ProjectLayoutStoreModule;
const memoryStorage = new MemoryStorage();

beforeAll(async () => {
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });

  projectLayoutModule = await import(
    "../../../src/renderer/src/features/workspace/stores/projectLayoutStore.js"
  );
});

beforeEach(() => {
  memoryStorage.clear();
  projectLayoutModule.useProjectLayoutStore.setState({ byProject: {} });
});

describe("projectLayoutStore", () => {
  it("sanitizes docs tabs and keeps supported values", () => {
    expect(projectLayoutModule.sanitizePersistedDocsRightTab("character")).toBe("character");
    expect(projectLayoutModule.sanitizePersistedDocsRightTab("snapshot")).toBe("snapshot");
    expect(projectLayoutModule.sanitizePersistedDocsRightTab("trash")).toBe("trash");
    expect(projectLayoutModule.sanitizePersistedDocsRightTab(null)).toBeNull();
  });

  it("stores and restores per-project layout independently", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      docs: {
        sidebarOpen: true,
        binderBarOpen: false,
        rightTab: "analysis",
      },
    });

    store.upsertProjectLayout("project-b", {
      docs: {
        sidebarOpen: false,
        binderBarOpen: true,
        rightTab: "world",
      },
    });

    const a = projectLayoutModule.useProjectLayoutStore.getState().getProjectLayout("project-a");
    const b = projectLayoutModule.useProjectLayoutStore.getState().getProjectLayout("project-b");

    expect(a.docs.rightTab).toBe("analysis");
    expect(a.docs.binderBarOpen).toBe(false);
    expect(b.docs.rightTab).toBe("world");
    expect(b.docs.sidebarOpen).toBe(false);
  });

  it("persists snapshot docs tab on write", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      docs: {
        sidebarOpen: true,
        binderBarOpen: true,
        rightTab: "snapshot" as never,
      },
    });

    const saved = projectLayoutModule.useProjectLayoutStore.getState().getProjectLayout("project-a");
    expect(saved.docs.rightTab).toBe("snapshot");
  });

  it("stores docs and editor right rail state independently", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      docs: {
        sidebarOpen: true,
        binderBarOpen: false,
        rightTab: "world",
      },
    });
    store.upsertProjectLayout("project-a", {
      editor: {
        sidebarOpen: false,
        binderRailOpen: true,
        rightTab: "event",
      },
    });

    const saved = projectLayoutModule.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-a");
    expect(saved.docs.sidebarOpen).toBe(true);
    expect(saved.docs.binderBarOpen).toBe(false);
    expect(saved.docs.rightTab).toBe("world");
    expect(saved.editor.sidebarOpen).toBe(false);
    expect(saved.editor.binderRailOpen).toBe(true);
    expect(saved.editor.rightTab).toBe("event");
  });

  it("keeps existing right tabs when partial chrome patches omit them", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      docs: {
        rightTab: "world",
      },
      editor: {
        rightTab: "event",
      },
    });
    store.upsertProjectLayout("project-a", {
      docs: {
        binderBarOpen: false,
      },
      editor: {
        binderRailOpen: false,
      },
    });

    const saved = projectLayoutModule.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-a");
    expect(saved.docs.rightTab).toBe("world");
    expect(saved.docs.binderBarOpen).toBe(false);
    expect(saved.editor.rightTab).toBe("event");
    expect(saved.editor.binderRailOpen).toBe(false);
  });

  it("merges sidebar widths and layout ratios without dropping existing values", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      sidebarWidths: {
        characterSidebar: 330,
      },
      layoutSurfaceRatios: {
        "docs.panel.character": 38,
      },
    });
    store.upsertProjectLayout("project-a", {
      sidebarWidths: {
        factionSidebar: 350,
      },
      layoutSurfaceRatios: {
        "docs.panel.faction": 41,
      },
    });

    const saved = projectLayoutModule.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-a");
    expect(saved.sidebarWidths.characterSidebar).toBe(330);
    expect(saved.sidebarWidths.factionSidebar).toBe(350);
    expect(saved.layoutSurfaceRatios["docs.panel.character"]).toBe(38);
    expect(saved.layoutSurfaceRatios["docs.panel.faction"]).toBe(41);
  });

  it("stores workspace research panel layout with its last split size", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      workspace: {
        panels: [
          {
            id: "research-character",
            content: { type: "research", tab: "character" },
            size: 62.5,
          },
          {
            id: "research-faction",
            content: { type: "research", tab: "faction" },
            size: 37.5,
          },
        ],
        researchPanelSizes: {
          character: 62.5,
          event: 48,
          faction: 37.5,
        },
      },
    });

    const saved = projectLayoutModule.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-a");

    expect(saved.workspace.panels).toEqual([
      {
        id: "research-character",
        content: { type: "research", tab: "character" },
        size: 62.5,
      },
      {
        id: "research-faction",
        content: { type: "research", tab: "faction" },
        size: 37.5,
      },
    ]);
    expect(saved.workspace.researchPanelSizes).toEqual({
      character: 62.5,
      event: 48,
      faction: 37.5,
    });
  });

  it("keeps independent research panel sizes when only one tab is updated", () => {
    const store = projectLayoutModule.useProjectLayoutStore.getState();

    store.upsertProjectLayout("project-a", {
      workspace: {
        researchPanelSizes: {
          character: 61,
          event: 44,
          faction: 39,
          world: 53,
          scrap: 47,
          analysis: 58,
        },
      },
    });

    store.upsertProjectLayout("project-a", {
      workspace: {
        researchPanelSizes: {
          event: 50,
        },
      },
    });

    const saved = projectLayoutModule.useProjectLayoutStore
      .getState()
      .getProjectLayout("project-a");

    expect(saved.workspace.researchPanelSizes).toEqual({
      character: 61,
      event: 50,
      faction: 39,
      world: 53,
      scrap: 47,
      analysis: 58,
    });
  });
});
