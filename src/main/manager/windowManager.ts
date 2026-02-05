/**
 * Window Manager - BrowserWindow 관리
 */

import { BrowserWindow, app } from 'electron'
import { join } from 'path'
import { createLogger } from '../../shared/logger/index.js'
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

    this.mainWindow = new BrowserWindow({
      width: WINDOW_DEFAULT_WIDTH,
      height: WINDOW_DEFAULT_HEIGHT,
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

    // Load the renderer based on environment
    const isPackaged = app.isPackaged
    const isDev = !isPackaged

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
}

export const windowManager = new WindowManager()
