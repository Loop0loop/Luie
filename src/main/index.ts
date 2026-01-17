/**
 * Main process entry point
 */

import { app, BrowserWindow } from 'electron'
import { createLogger } from '../shared/logger/index.js'
import { windowManager } from './manager/index.js'
import { registerIPCHandlers } from './handler/index.js'
import { db } from './database/index.js'

const logger = createLogger('Main')

// Disable GPU acceleration for better stability
app.disableHardwareAcceleration()

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  logger.warn('Another instance is already running')
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = windowManager.getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // App ready
  app.whenReady().then(() => {
    logger.info('App is ready')
    
    // Register IPC handlers
    registerIPCHandlers()
    
    // Create main window
    windowManager.createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow()
      }
    })
  })

  // Quit when all windows are closed (except on macOS)
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Before quit - cleanup
  app.on('before-quit', async () => {
    logger.info('App is quitting')
    await db.disconnect()
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', error)
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason)
  })
}
