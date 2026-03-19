import { beforeEach, describe, expect, it, vi } from "vitest";

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

const loadStore = async () => {
  vi.resetModules();
  Object.defineProperty(globalThis, "localStorage", {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });

  return import("../../../src/renderer/src/features/research/stores/worldGraphUiStore.js");
};

describe("worldGraphUiStore", () => {
  beforeEach(() => {
    memoryStorage.clear();
  });

  it("defaults to canvas tab and open sidebar", async () => {
    const module = await loadStore();
    const state = module.useWorldGraphUiStore.getState();
    expect(state.activeTab).toBe("canvas");
    expect(state.isSidebarOpen).toBe(true);
    expect(state.sidebarWidth).toBe(320);
  });

  it("clamps persisted sidebar width updates", async () => {
    const module = await loadStore();
    module.useWorldGraphUiStore.getState().setSidebarWidth(999);
    expect(module.useWorldGraphUiStore.getState().sidebarWidth).toBe(520);

    module.useWorldGraphUiStore.getState().setSidebarWidth(10);
    expect(module.useWorldGraphUiStore.getState().sidebarWidth).toBe(220);
  });

  it("increments autoLayout trigger monotonically", async () => {
    const module = await loadStore();
    const before = module.useWorldGraphUiStore.getState().autoLayoutTrigger;
    module.useWorldGraphUiStore.getState().triggerAutoLayout();
    module.useWorldGraphUiStore.getState().triggerAutoLayout();
    expect(module.useWorldGraphUiStore.getState().autoLayoutTrigger).toBe(
      before + 2,
    );
  });
});
