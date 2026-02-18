import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type BrowserWindowOptionsLike = {
  webPreferences?: {
    preload?: string;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    sandbox?: boolean;
  };
};

const createdWindowOptions: BrowserWindowOptionsLike[] = [];

const windowStateManageMock = vi.fn();
const browserWindows: MockBrowserWindow[] = [];

class MockBrowserWindow {
  public static getAllWindows(): MockBrowserWindow[] {
    return [...browserWindows];
  }

  public static getFocusedWindow(): MockBrowserWindow | null {
    return browserWindows.at(-1) ?? null;
  }

  public readonly webContents = {
    openDevTools: vi.fn(),
  };

  private readonly listeners = new Map<string, Array<() => void>>();
  private destroyed = false;
  private maximized = false;
  private fullscreen = false;
  private simpleFullscreen = false;
  private menuVisible = true;
  private autoHideMenuBar = false;

  constructor(options: BrowserWindowOptionsLike) {
    createdWindowOptions.push(options);
    browserWindows.push(this);
  }

  public on(event: string, listener: () => void): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(listener);
    this.listeners.set(event, existing);
  }

  public close(): void {
    this.destroyed = true;
    this.emit("closed");
    const index = browserWindows.indexOf(this);
    if (index >= 0) {
      browserWindows.splice(index, 1);
    }
  }

  public isDestroyed(): boolean {
    return this.destroyed;
  }

  public focus(): void {}

  public loadURL(_url: string): void {}

  public loadFile(_filePath: string, _options?: unknown): void {}

  public isMaximized(): boolean {
    return this.maximized;
  }

  public maximize(): void {
    this.maximized = true;
  }

  public isSimpleFullScreen(): boolean {
    return this.simpleFullscreen;
  }

  public setSimpleFullScreen(flag: boolean): void {
    this.simpleFullscreen = flag;
  }

  public isFullScreen(): boolean {
    return this.fullscreen;
  }

  public setFullScreen(flag: boolean): void {
    this.fullscreen = flag;
  }

  public setMenuBarVisibility(flag: boolean): void {
    this.menuVisible = flag;
  }

  public setAutoHideMenuBar(flag: boolean): void {
    this.autoHideMenuBar = flag;
  }

  private emit(event: string): void {
    const handlers = this.listeners.get(event) ?? [];
    for (const handler of handlers) {
      handler();
    }
  }
}

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getPath: () => path.join(process.cwd(), "prisma", ".tmp", "window-manager-test"),
  },
  BrowserWindow: MockBrowserWindow,
}));

vi.mock("electron-window-state", () => ({
  default: () => ({
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    manage: windowStateManageMock,
  }),
}));

vi.mock("../../../src/main/manager/settingsManager.js", () => ({
  settingsManager: {
    getMenuBarMode: () => "visible",
  },
}));

describe("WindowManager security webPreferences", () => {
  beforeEach(() => {
    vi.resetModules();
    createdWindowOptions.length = 0;
    browserWindows.length = 0;
    windowStateManageMock.mockReset();
    process.env.NODE_ENV = "test";
    process.env.VITE_DEV_SERVER_URL = "http://localhost:5173";
  });

  it("creates the main window with sandboxed preload bridge", async () => {
    const { windowManager } = await import("../../../src/main/manager/windowManager.js");
    windowManager.createMainWindow();

    expect(createdWindowOptions).toHaveLength(1);
    const webPreferences = createdWindowOptions[0].webPreferences;

    expect(webPreferences?.sandbox).toBe(true);
    expect(webPreferences?.contextIsolation).toBe(true);
    expect(webPreferences?.nodeIntegration).toBe(false);
    expect(webPreferences?.preload).toMatch(/preload[\\/]+index\.cjs$/);
  });

  it("creates the export window with the same sandboxed preload bridge", async () => {
    const { windowManager } = await import("../../../src/main/manager/windowManager.js");
    windowManager.createExportWindow("chapter-1");

    expect(createdWindowOptions).toHaveLength(1);
    const webPreferences = createdWindowOptions[0].webPreferences;

    expect(webPreferences?.sandbox).toBe(true);
    expect(webPreferences?.contextIsolation).toBe(true);
    expect(webPreferences?.nodeIntegration).toBe(false);
    expect(webPreferences?.preload).toMatch(/preload[\\/]+index\.cjs$/);
  });
});
