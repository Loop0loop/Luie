/**
 * Window Manager - BrowserWindow 관리
 */

import { BrowserWindow, type BrowserWindowConstructorOptions } from "electron"
import { join } from "path"
import windowStateKeeper from "electron-window-state"
import { createLogger } from "../../shared/logger/index.js"
import {
  APP_NAME,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
} from "../../shared/constants/index.js"
import { settingsManager } from "./settingsManager.js"
import {
  applyWindowMenuBarMode,
  createSecureWebPreferences,
  getTitleBarOptions,
  resolveWindowIconPath,
  shouldShowMenuBar,
  WINDOW_BACKGROUND_COLOR,
  withWindowIcon,
} from "./window/windowChrome.js"
import {
  getRendererEnvironment,
  loadRendererRoute,
  type RendererRouteTarget,
} from "./window/windowRouting.js"

const logger = createLogger("WindowManager")

class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private startupWizardWindow: BrowserWindow | null = null
  private exportWindow: BrowserWindow | null = null
  private worldGraphWindow: BrowserWindow | null = null

  private getMenuBarMode() {
    return settingsManager.getMenuBarMode()
  }

  private applyMenuBarMode(win: BrowserWindow) {
    applyWindowMenuBarMode(win, this.getMenuBarMode())
  }

  private createBrowserWindow(
    options: BrowserWindowConstructorOptions,
  ): BrowserWindow {
    return new BrowserWindow({
      ...options,
      webPreferences:
        options.webPreferences ??
        createSecureWebPreferences(join(__dirname, "../preload/index.cjs")),
    })
  }

  private attachWindowClosedLogger(
    win: BrowserWindow,
    onClosed: () => void,
    label: string,
  ): void {
    win.on("closed", () => {
      onClosed()
      logger.info(`${label} closed`)
    })
  }

  private attachWindowEvent(
    win: BrowserWindow,
    eventName: "ready-to-show",
    listener: () => void,
  ): void {
    const eventTarget = win as BrowserWindow & {
      once?: (event: "ready-to-show", listener: () => void) => BrowserWindow
      on: (event: "ready-to-show", listener: () => void) => BrowserWindow
    }

    if (typeof eventTarget.once === "function") {
      eventTarget.once(eventName, listener)
      return
    }
    eventTarget.on(eventName, listener)
  }

  private async loadSecondaryWindowRoute(input: {
    label: string
    openDevToolsInDev?: boolean
    route: RendererRouteTarget
    window: BrowserWindow
  }): Promise<void> {
    const environment = await loadRendererRoute({
      baseDir: __dirname,
      label: input.label,
      logger,
      route: input.route,
      window: input.window,
    })

    if (input.openDevToolsInDev && environment.useDevServer) {
      input.window.webContents.openDevTools({ mode: "detach" })
    }
  }

  private attachLoadFailureLogging(
    result: Promise<unknown> | unknown,
    onError: (error: unknown) => void,
  ): void {
    if (
      result &&
      typeof result === "object" &&
      "catch" in result &&
      typeof result.catch === "function"
    ) {
      void result.catch(onError)
    }
  }

  createMainWindow(options: { deferShow?: boolean } = {}): BrowserWindow {
    const deferShow = options.deferShow === true
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow
    }
    this.mainWindow = null

    const windowState = windowStateKeeper({
      defaultWidth: WINDOW_DEFAULT_WIDTH,
      defaultHeight: WINDOW_DEFAULT_HEIGHT,
    })
    const environment = getRendererEnvironment()
    const windowIconPath = resolveWindowIconPath()

    this.mainWindow = this.createBrowserWindow({
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      title: APP_NAME,
      show: false,
      backgroundColor: WINDOW_BACKGROUND_COLOR,
      ...withWindowIcon(windowIconPath),
      ...getTitleBarOptions(),
      ...(process.platform !== "darwin"
        ? { autoHideMenuBar: !shouldShowMenuBar(this.getMenuBarMode()) }
        : {}),
    })

    this.applyMenuBarMode(this.mainWindow)
    windowState.manage(this.mainWindow)

    if (environment.useDevServer) {
      logger.info("Loading development server", {
        url: environment.devServerUrl,
        isPackaged: environment.isPackaged,
      })
      this.attachLoadFailureLogging(
        this.mainWindow.loadURL(environment.devServerUrl),
        (error) => {
          logger.error("Failed to load development renderer URL", {
            url: environment.devServerUrl,
            error,
          })
        },
      )
      this.mainWindow.webContents.openDevTools({ mode: "detach" })
    } else {
      const indexPath = join(__dirname, "../renderer/index.html")
      logger.info("Loading production renderer", {
        path: indexPath,
        isPackaged: environment.isPackaged,
      })
      this.attachLoadFailureLogging(this.mainWindow.loadFile(indexPath), (error) => {
        logger.error("Failed to load production renderer file", {
          path: indexPath,
          error,
        })
      })
    }

    this.attachWindowEvent(this.mainWindow, "ready-to-show", () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        logger.info("Main window ready to show", { deferShow })
        if (!deferShow) {
          this.showMainWindow()
        }
      }
    })

    this.attachWindowClosedLogger(
      this.mainWindow,
      () => {
        this.mainWindow = null
      },
      "Main window",
    )

    logger.info("Main window created", {
      isPackaged: environment.isPackaged,
      useDevServer: environment.useDevServer,
    })
    return this.mainWindow
  }

  createStartupWizardWindow(): BrowserWindow {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed()) {
      this.startupWizardWindow.focus()
      return this.startupWizardWindow
    }

    this.startupWizardWindow = this.createBrowserWindow({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: true,
      title: `${APP_NAME} Setup`,
      backgroundColor: "#0b1020",
      ...withWindowIcon(resolveWindowIconPath()),
      ...getTitleBarOptions(),
      ...(process.platform !== "darwin" ? { autoHideMenuBar: true } : {}),
    })

    this.applyMenuBarMode(this.startupWizardWindow)

    void this.loadSecondaryWindowRoute({
      label: "startup wizard",
      route: { hash: "startup-wizard" },
      window: this.startupWizardWindow,
    }).catch((error) => {
      logger.error("Failed to load startup wizard", { error })
    })

    this.attachWindowClosedLogger(
      this.startupWizardWindow,
      () => {
        this.startupWizardWindow = null
      },
      "Startup wizard window",
    )

    return this.startupWizardWindow
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  isMainWindowWebContentsId(webContentsId: number): boolean {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return false
    }
    return this.mainWindow.webContents.id === webContentsId
  }

  getStartupWizardWindow(): BrowserWindow | null {
    return this.startupWizardWindow
  }

  closeStartupWizardWindow(): void {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed()) {
      this.startupWizardWindow.close()
    }
    this.startupWizardWindow = null
  }

  closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close()
    }
  }

  showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }
    if (!this.mainWindow.isVisible()) {
      this.mainWindow.show()
    }
    this.mainWindow.focus()
  }

  createExportWindow(chapterId: string): BrowserWindow {
    if (this.exportWindow && !this.exportWindow.isDestroyed()) {
      this.exportWindow.focus()
      return this.exportWindow
    }
    this.exportWindow = null

    this.exportWindow = this.createBrowserWindow({
      width: 1200,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: WINDOW_BACKGROUND_COLOR,
      ...withWindowIcon(resolveWindowIconPath()),
      ...getTitleBarOptions(),
      ...(process.platform !== "darwin"
        ? { autoHideMenuBar: !shouldShowMenuBar(this.getMenuBarMode()) }
        : {}),
    })

    this.applyMenuBarMode(this.exportWindow)

    const route = { hash: "export", search: `?chapterId=${chapterId}` }
    void this.loadSecondaryWindowRoute({
      label: "export window",
      openDevToolsInDev: true,
      route,
      window: this.exportWindow,
    }).catch((error) => {
      logger.error("Failed to load export window", { route, error })
    })

    this.attachWindowClosedLogger(
      this.exportWindow,
      () => {
        this.exportWindow = null
      },
      "Export window",
    )

    return this.exportWindow
  }

  createWorldGraphWindow(): BrowserWindow {
    if (this.worldGraphWindow && !this.worldGraphWindow.isDestroyed()) {
      this.worldGraphWindow.focus()
      return this.worldGraphWindow
    }
    this.worldGraphWindow = null

    this.worldGraphWindow = this.createBrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: WINDOW_BACKGROUND_COLOR,
      ...withWindowIcon(resolveWindowIconPath()),
      ...getTitleBarOptions(),
      ...(process.platform !== "darwin"
        ? { autoHideMenuBar: !shouldShowMenuBar(this.getMenuBarMode()) }
        : {}),
    })

    this.applyMenuBarMode(this.worldGraphWindow)

    void this.loadSecondaryWindowRoute({
      label: "world graph window",
      openDevToolsInDev: true,
      route: { hash: "world-graph" },
      window: this.worldGraphWindow,
    }).catch((error) => {
      logger.error("Failed to load world graph window", { error })
    })

    this.attachWindowClosedLogger(
      this.worldGraphWindow,
      () => {
        this.worldGraphWindow = null
      },
      "World graph window",
    )

    return this.worldGraphWindow
  }

  applyMenuBarModeToAllWindows(): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        this.applyMenuBarMode(win)
      }
    }
  }
}

export const windowManager = new WindowManager()
