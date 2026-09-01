import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type BrowserWindowOptionsLike = {
  webPreferences?: {
    preload?: string;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
    sandbox?: boolean;
    spellcheck?: boolean;
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
    session: {
      setSpellCheckerEnabled: vi.fn(),
    },
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
    getPath: () => path.join(process.cwd(), "drizzle", ".tmp", "window-manager-test"),
  },
  BrowserWindow: MockBrowserWindow,
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workArea: { x: 0, y: 0, width: 1440, height: 900 },
    })),
    getDisplayMatching: vi.fn(() => ({
      workArea: { x: 0, y: 0, width: 1440, height: 900 },
    })),
    getDisplayNearestPoint: vi.fn(() => ({
      workArea: { x: 0, y: 0, width: 1440, height: 900 },
    })),
    getCursorScreenPoint: vi.fn(() => ({ x: 0, y: 0 })),
  },
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

vi.mock("../../../src/main/manager/settings/index.js", () => ({
  settingsManager: {
    getMenuBarMode: () => "visible",
    getEditorSettings: () => ({
      spellcheckEnabled: true,
    }),
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
    const { windowManager } = await import("../../../src/main/manager/window/index.js");
    windowManager.createMainWindow();

    expect(createdWindowOptions).toHaveLength(1);
    const webPreferences = createdWindowOptions[0].webPreferences;

    expect(webPreferences?.sandbox).toBe(true);
    expect(webPreferences?.contextIsolation).toBe(true);
    expect(webPreferences?.nodeIntegration).toBe(false);
    expect(webPreferences?.spellcheck).toBe(true);
    expect(webPreferences?.preload).toMatch(/preload[\\/]+index\.cjs$/);
  });

  it("creates the export window with the same sandboxed preload bridge", async () => {
    const { windowManager } = await import("../../../src/main/manager/window/index.js");
    windowManager.createExportWindow("chapter-1");

    expect(createdWindowOptions).toHaveLength(1);
    const webPreferences = createdWindowOptions[0].webPreferences;

    expect(webPreferences?.sandbox).toBe(true);
    expect(webPreferences?.contextIsolation).toBe(true);
    expect(webPreferences?.nodeIntegration).toBe(false);
    expect(webPreferences?.spellcheck).toBe(true);
    expect(webPreferences?.preload).toMatch(/preload[\\/]+index\.cjs$/);
  });

  describe("calculateStartupWizardInitialBounds", () => {
    it("calculates bounds for various display resolutions with clamp", async () => {
      const { calculateStartupWizardInitialBounds } = await import(
        "../../../src/main/manager/window/windowStartupWizard.js"
      );
      const { screen } = await import("electron");

      const setMock = (width: number, height: number, x = 0, y = 0) => {
        const display = {
          workArea: { x, y, width, height },
        } as unknown as Electron.Display;
        vi.spyOn(screen, "getPrimaryDisplay").mockReturnValue(display);
        vi.spyOn(screen, "getDisplayNearestPoint").mockReturnValue(display);
      };

      // 1280x720 (minimum clamp: 420x600)
      setMock(1280, 720);
      const minBounds = calculateStartupWizardInitialBounds();
      expect(minBounds.width).toBe(420);
      expect(minBounds.height).toBe(600);
      expect(minBounds.x).toBe(Math.round((1280 - 420) / 2));
      expect(minBounds.y).toBe(Math.round((720 - 600) / 2));

      // 1728x1117 (scaled: 484x726)
      setMock(1728, 1117);
      const macBounds = calculateStartupWizardInitialBounds();
      expect(macBounds.width).toBe(484);
      expect(macBounds.height).toBe(726);

      // 1920x1080 (FHD: 538x702)
      setMock(1920, 1080);
      const fhdBounds = calculateStartupWizardInitialBounds();
      expect(fhdBounds.width).toBe(538);
      expect(fhdBounds.height).toBe(702);

      // 3840x2160 (4K clamp: 560x820)
      setMock(3840, 2160);
      const uhdBounds = calculateStartupWizardInitialBounds();
      expect(uhdBounds.width).toBe(560);
      expect(uhdBounds.height).toBe(820);
    });

    it("calculates expanded bounds for horizontal preview with clamp", async () => {
      const { calculateStartupWizardExpandedBounds } = await import(
        "../../../src/main/manager/window/windowStartupWizard.js"
      );
      const { screen } = await import("electron");

      const setMock = (width: number, height: number, x = 0, y = 0) => {
        const display = {
          workArea: { x, y, width, height },
        } as unknown as Electron.Display;
        vi.spyOn(screen, "getPrimaryDisplay").mockReturnValue(display);
        vi.spyOn(screen, "getDisplayNearestPoint").mockReturnValue(display);
      };

      // 1280x720 (82% -> 1050x590 -> height clamp 680)
      setMock(1280, 720);
      const minBounds = calculateStartupWizardExpandedBounds();
      expect(minBounds.width).toBe(1050);
      expect(minBounds.height).toBe(680);

      // 1920x1080 (FHD: 82% -> 1574x886)
      setMock(1920, 1080);
      const fhdBounds = calculateStartupWizardExpandedBounds();
      expect(fhdBounds.width).toBe(1574);
      expect(fhdBounds.height).toBe(886);

      // 3840x2160 (4K clamp: 1600x1000)
      setMock(3840, 2160);
      const uhdBounds = calculateStartupWizardExpandedBounds();
      expect(uhdBounds.width).toBe(1600);
      expect(uhdBounds.height).toBe(1000);
    });

    it("verifies safe editor width and ratio across all target resolutions", async () => {
      const { calculateStartupWizardExpandedBounds } = await import(
        "../../../src/main/manager/window/windowStartupWizard.js"
      );
      const { screen } = await import("electron");

      const targetDisplays = [
        { name: "HD (1280x720)", w: 1280, h: 720 },
        { name: "Laptop (1366x768)", w: 1366, h: 768 },
        { name: "MacBook Air 13 (1440x900)", w: 1440, h: 900 },
        { name: "MacBook Pro 16 (1728x1117)", w: 1728, h: 1117 },
        { name: "FHD (1920x1080)", w: 1920, h: 1080 },
        { name: "QHD (2560x1440)", w: 2560, h: 1440 },
        { name: "4K UHD (3840x2160)", w: 3840, h: 2160 },
      ];

      const SIDEBAR_PX = 210;
      const INSPECTOR_PX = 260;

      for (const res of targetDisplays) {
        const display = {
          workArea: { x: 0, y: 0, width: res.w, height: res.h },
        } as unknown as Electron.Display;
        vi.spyOn(screen, "getPrimaryDisplay").mockReturnValue(display);
        vi.spyOn(screen, "getDisplayNearestPoint").mockReturnValue(display);

        const bounds = calculateStartupWizardExpandedBounds();

        // 1. 창 크기 안전 범위 검증
        expect(bounds.width).toBeGreaterThanOrEqual(1000);
        expect(bounds.width).toBeLessThanOrEqual(1600);
        expect(bounds.height).toBeGreaterThanOrEqual(680);
        expect(bounds.height).toBeLessThanOrEqual(1000);

        // 2. 기본/Docs/Editor 레이아웃(사이드바 210px): 본문 점유율 >= 78%, 본문 폭 >= 790px
        const singleSidebarEditorWidth = bounds.width - SIDEBAR_PX;
        const singleSidebarRatio = (singleSidebarEditorWidth / bounds.width) * 100;
        expect(singleSidebarEditorWidth).toBeGreaterThanOrEqual(790);
        expect(singleSidebarRatio).toBeGreaterThanOrEqual(78);

        // 3. Scrivener 3단 레이아웃(바인더 210px + 인스펙터 260px): 본문 점유율 >= 52%, 본문 폭 >= 530px
        const scrivenerEditorWidth = bounds.width - (SIDEBAR_PX + INSPECTOR_PX);
        const scrivenerRatio = (scrivenerEditorWidth / bounds.width) * 100;
        expect(scrivenerEditorWidth).toBeGreaterThanOrEqual(530);
        expect(scrivenerRatio).toBeGreaterThanOrEqual(52);
      }
    });
  });
});
