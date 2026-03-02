/**
 * Window Manager - BrowserWindow 관리
 */

import { BrowserWindow, app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import windowStateKeeper from 'electron-window-state'
import { createLogger } from '../../shared/logger/index.js'
import {
  APP_NAME,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_TRAFFIC_LIGHT_X,
  WINDOW_TRAFFIC_LIGHT_Y,
} from '../../shared/constants/index.js'
import { settingsManager } from './settingsManager.js'

const logger = createLogger('WindowManager')
const WINDOW_BACKGROUND_COLOR = '#f4f4f5'

class WindowManager {
  private mainWindow: BrowserWindow | null = null
  private startupWizardWindow: BrowserWindow | null = null

  private resolveWindowIconPath(): string | undefined {
    const packagedCandidates = [
      join(process.resourcesPath, 'icon.png'),
      join(process.resourcesPath, 'build', 'icons', 'icon.png'),
    ]
    const devCandidates = [
      join(app.getAppPath(), 'build', 'icons', 'icon.png'),
      join(app.getAppPath(), 'assets', 'public', 'luie.png'),
    ]

    const candidates = app.isPackaged ? packagedCandidates : devCandidates
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
    return undefined
  }

  private getTitleBarOptions() {
    if (process.platform !== 'darwin') {
      return {}
    }

    return {
      titleBarStyle: 'hiddenInset' as const,
      trafficLightPosition: { x: WINDOW_TRAFFIC_LIGHT_X, y: WINDOW_TRAFFIC_LIGHT_Y },
    }
  }

  private getMenuBarMode() {
    return settingsManager.getMenuBarMode()
  }

  private shouldShowMenuBar() {
    if (process.platform !== 'darwin') {
      return false
    }
    return this.getMenuBarMode() === 'visible'
  }

  private applyMenuBarMode(win: BrowserWindow) {
    const shouldShowMenuBar = this.shouldShowMenuBar()

    if (process.platform === 'darwin') {
      if (shouldShowMenuBar) {
        if (win.isSimpleFullScreen()) {
          win.setSimpleFullScreen(false)
        }
        if (win.isFullScreen()) {
          win.setFullScreen(false)
        }
        win.setMenuBarVisibility(true)
        return
      }

      win.setMenuBarVisibility(false)
      if (!win.isSimpleFullScreen()) {
        win.setSimpleFullScreen(true)
      }
      return
    }

    win.setAutoHideMenuBar(true)
    win.setMenuBarVisibility(false)
  }

  createMainWindow(options: { deferShow?: boolean } = {}): BrowserWindow {
    const deferShow = options.deferShow === true
    if (this.mainWindow) {
      return this.mainWindow
    }

    // Load window state (position, size, maximized)
    const windowState = windowStateKeeper({
      defaultWidth: WINDOW_DEFAULT_WIDTH,
      defaultHeight: WINDOW_DEFAULT_HEIGHT,
    })

    const windowIconPath = this.resolveWindowIconPath()

    this.mainWindow = new BrowserWindow({
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      title: APP_NAME,
      show: false,
      backgroundColor: WINDOW_BACKGROUND_COLOR,
      ...(windowIconPath ? { icon: windowIconPath } : {}),
      ...this.getTitleBarOptions(),
      ...(process.platform !== 'darwin'
        ? { autoHideMenuBar: !this.shouldShowMenuBar() }
        : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    this.applyMenuBarMode(this.mainWindow)

    // Track window state changes
    windowState.manage(this.mainWindow)

    // Load the renderer based on environment
    const isPackaged = app.isPackaged

    // electron-vite dev command sets VITE_DEV_SERVER_URL
    // If not packaged and no VITE_DEV_SERVER_URL, check if dev server is available
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

    // Use dev server if not packaged (unless explicitly building for production preview)
    const useDevServer = !isPackaged && process.env.NODE_ENV !== 'production'

    if (useDevServer) {
      logger.info('Loading development server', { url: devServerUrl, isPackaged })
      void this.mainWindow.loadURL(devServerUrl).catch((error) => {
        logger.error('Failed to load development renderer URL', { url: devServerUrl, error })
      })
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      const indexPath = join(__dirname, '../renderer/index.html')
      logger.info('Loading production renderer', { path: indexPath, isPackaged })
      void this.mainWindow.loadFile(indexPath).catch((error) => {
        logger.error('Failed to load production renderer file', { path: indexPath, error })
      })
    }

    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        logger.info('Main window ready to show', { deferShow })
        if (!deferShow) {
          this.showMainWindow()
        }
      }
    })

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
      logger.info('Main window closed')
    })

    logger.info('Main window created', { isPackaged, useDevServer })
    return this.mainWindow
  }

  createStartupWizardWindow(): BrowserWindow {
    if (this.startupWizardWindow && !this.startupWizardWindow.isDestroyed()) {
      this.startupWizardWindow.focus()
      return this.startupWizardWindow
    }

    const windowIconPath = this.resolveWindowIconPath()
    const isPackaged = app.isPackaged
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    const useDevServer = !isPackaged && process.env.NODE_ENV !== 'production'

    this.startupWizardWindow = new BrowserWindow({
      width: 980,
      height: 720,
      minWidth: 860,
      minHeight: 620,
      show: true,
      title: `${APP_NAME} Setup`,
      backgroundColor: '#0b1020',
      ...(windowIconPath ? { icon: windowIconPath } : {}),
      ...this.getTitleBarOptions(),
      ...(process.platform !== 'darwin' ? { autoHideMenuBar: true } : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    this.applyMenuBarMode(this.startupWizardWindow)

    if (useDevServer) {
      const wizardUrl = `${devServerUrl}/#startup-wizard`
      logger.info('Loading startup wizard (dev)', { wizardUrl })
      void this.startupWizardWindow.loadURL(wizardUrl).catch((error) => {
        logger.error('Failed to load startup wizard (dev)', { wizardUrl, error })
      })
    } else {
      const indexPath = join(__dirname, '../renderer/index.html')
      logger.info('Loading startup wizard (prod)', { path: indexPath })
      void this.startupWizardWindow.loadFile(indexPath, { hash: 'startup-wizard' }).catch((error) => {
        logger.error('Failed to load startup wizard (prod)', { path: indexPath, error })
      })
    }

    this.startupWizardWindow.on('closed', () => {
      this.startupWizardWindow = null
      logger.info('Startup wizard window closed')
    })

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

  // ─── Export Window ────────────────────────────────────────────────────────
  private exportWindow: BrowserWindow | null = null

  createExportWindow(chapterId: string): BrowserWindow {
    if (this.exportWindow) {
      this.exportWindow.focus()
      return this.exportWindow
    }

    // Default size for export preview (large enough for split view)
    const width = 1200
    const height = 900

    const windowIconPath = this.resolveWindowIconPath()

    this.exportWindow = new BrowserWindow({
      width,
      height,
      minWidth: 1000,
      minHeight: 700,
      title: "내보내기 및 인쇄 미리보기",
      backgroundColor: WINDOW_BACKGROUND_COLOR,
      ...(windowIconPath ? { icon: windowIconPath } : {}),
      ...this.getTitleBarOptions(),
      ...(process.platform !== 'darwin'
        ? { autoHideMenuBar: !this.shouldShowMenuBar() }
        : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    this.applyMenuBarMode(this.exportWindow)

    // Load URL with hash routing
    const isPackaged = app.isPackaged
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    const useDevServer = !isPackaged && process.env.NODE_ENV !== 'production'
    const query = `?chapterId=${chapterId}`
    const hash = '#export'

    if (useDevServer) {
      const url = `${devServerUrl}/${query}${hash}`
      logger.info('Loading export window (dev)', { url })
      void this.exportWindow.loadURL(url).catch((error) => {
        logger.error('Failed to load export window (dev)', { url, error })
      })
    } else {
      const indexPath = join(__dirname, '../renderer/index.html')
      logger.info('Loading export window (prod)', { path: indexPath })
      void this.exportWindow
        .loadFile(indexPath, { hash: 'export', search: query })
        .catch((error) => {
          logger.error('Failed to load export window (prod)', {
            path: indexPath,
            hash: 'export',
            search: query,
            error,
          })
        })
    }

    this.exportWindow.on('closed', () => {
      this.exportWindow = null
      logger.info('Export window closed')
    })

    // Open DevTools in dev mode
    if (useDevServer) {
      this.exportWindow.webContents.openDevTools({ mode: 'detach' })
    }

    return this.exportWindow
  }

  // ─── World Graph Window ───────────────────────────────────────────────────
  private worldGraphWindow: BrowserWindow | null = null

  createWorldGraphWindow(): BrowserWindow {
    if (this.worldGraphWindow) {
      this.worldGraphWindow.focus()
      return this.worldGraphWindow
    }

    const width = 1200
    const height = 800

    const windowIconPath = this.resolveWindowIconPath()

    this.worldGraphWindow = new BrowserWindow({
      width,
      height,
      minWidth: 1000,
      minHeight: 600,
      title: "세계관 그래프",
      backgroundColor: WINDOW_BACKGROUND_COLOR,
      ...(windowIconPath ? { icon: windowIconPath } : {}),
      ...this.getTitleBarOptions(),
      ...(process.platform !== 'darwin'
        ? { autoHideMenuBar: !this.shouldShowMenuBar() }
        : {}),
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    this.applyMenuBarMode(this.worldGraphWindow)

    // Load URL with hash routing
    const isPackaged = app.isPackaged
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    const useDevServer = !isPackaged && process.env.NODE_ENV !== 'production'
    const hash = '#world-graph'

    if (useDevServer) {
      const url = `${devServerUrl}/${hash}`
      logger.info('Loading world graph window (dev)', { url })
      void this.worldGraphWindow.loadURL(url).catch((error) => {
        logger.error('Failed to load world graph window (dev)', { url, error })
      })
    } else {
      const indexPath = join(__dirname, '../renderer/index.html')
      logger.info('Loading world graph window (prod)', { path: indexPath })
      void this.worldGraphWindow
        .loadFile(indexPath, { hash: 'world-graph' })
        .catch((error) => {
          logger.error('Failed to load world graph window (prod)', {
            path: indexPath,
            hash: 'world-graph',
            error,
          })
        })
    }

    this.worldGraphWindow.on('closed', () => {
      this.worldGraphWindow = null
      logger.info('World graph window closed')
    })

    // Open DevTools in dev mode
    if (useDevServer) {
      this.worldGraphWindow.webContents.openDevTools({ mode: 'detach' })
    }

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
