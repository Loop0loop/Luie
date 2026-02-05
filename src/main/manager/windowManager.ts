/**
 * Window Manager - BrowserWindow 관리
 */

import { BrowserWindow, app } from 'electron'
import type { Event, RenderProcessGoneDetails } from 'electron'
import windowStateKeeper from 'electron-window-state'
import { join } from 'path'
import { createLogger } from '../../shared/logger/index.js'
import { isRendererDevEnv } from '../utils/environment.js'
import {
  DEV_SERVER_URL,
  WINDOW_DEFAULT_HEIGHT,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH,
  WINDOW_TRAFFIC_LIGHT_X,
  WINDOW_TRAFFIC_LIGHT_Y,
} from '../../shared/constants/index.js'

const logger = createLogger('WindowManager')

class WindowManager {
  private mainWindow: BrowserWindow | null = null

  createMainWindow(): BrowserWindow {
    if (this.mainWindow) {
      return this.mainWindow
    }

    const windowState = windowStateKeeper({
      defaultWidth: WINDOW_DEFAULT_WIDTH,
      defaultHeight: WINDOW_DEFAULT_HEIGHT,
    })

    this.mainWindow = new BrowserWindow({
      x: windowState.x,
      y: windowState.y,
      width: windowState.width,
      height: windowState.height,
      minWidth: WINDOW_MIN_WIDTH,
      minHeight: WINDOW_MIN_HEIGHT,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: WINDOW_TRAFFIC_LIGHT_X, y: WINDOW_TRAFFIC_LIGHT_Y },
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })

    windowState.manage(this.mainWindow)

    // Load the renderer based on environment
    const isPackaged = app.isPackaged
    const isDev = isRendererDevEnv()

    if (isDev) {
      const devServerUrl = process.env.VITE_DEV_SERVER_URL || DEV_SERVER_URL
      logger.info('Loading development server', { url: devServerUrl, isPackaged })
      this.mainWindow.loadURL(devServerUrl)
      this.mainWindow.webContents.openDevTools({ mode: 'detach' })
    } else {
      const indexPath = join(__dirname, '../renderer/index.html')
      logger.info('Loading production renderer', { path: indexPath, isPackaged })
      this.mainWindow.loadFile(indexPath)
    }

    this.mainWindow.webContents.on(
      'render-process-gone',
      (_event: Event, details: RenderProcessGoneDetails) => {
        logger.error('Renderer process gone', details)
        this.restartRenderer()
      },
    )

    this.mainWindow.on('closed', () => {
      this.mainWindow = null
      logger.info('Main window closed')
    })

    logger.info('Main window created', { isPackaged, isDev })
    return this.mainWindow
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  closeMainWindow(): void {
    if (this.mainWindow) {
      this.mainWindow.close()
    }
  }

  restartRenderer(): BrowserWindow {
    if (this.mainWindow) {
      this.mainWindow.removeAllListeners()
      this.mainWindow.destroy()
      this.mainWindow = null
    }

    logger.warn('Restarting renderer')
    return this.createMainWindow()
  }
}

export const windowManager = new WindowManager()
