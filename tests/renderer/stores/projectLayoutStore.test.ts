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
});
