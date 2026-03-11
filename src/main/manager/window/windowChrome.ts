import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import { app } from "electron"
import { existsSync } from "fs"
import { join } from "path"
import {
  WINDOW_TRAFFIC_LIGHT_X,
  WINDOW_TRAFFIC_LIGHT_Y,
} from "../../../shared/constants/index.js"

export const WINDOW_BACKGROUND_COLOR = "#f4f4f5"

export const resolveWindowIconPath = (): string | undefined => {
  const packagedCandidates = [
    join(process.resourcesPath, "icon.png"),
    join(process.resourcesPath, "build", "icons", "icon.png"),
  ]
  const devCandidates = [
    join(app.getAppPath(), "build", "icons", "icon.png"),
    join(app.getAppPath(), "assets", "public", "luie.png"),
  ]

  const candidates = app.isPackaged ? packagedCandidates : devCandidates
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return undefined
}

export const getTitleBarOptions = (): Partial<BrowserWindowConstructorOptions> => {
  if (process.platform !== "darwin") {
    return {}
  }

  return {
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: WINDOW_TRAFFIC_LIGHT_X, y: WINDOW_TRAFFIC_LIGHT_Y },
  }
}

export const shouldShowMenuBar = (menuBarMode: string): boolean => {
  if (process.platform !== "darwin") {
    return false
  }
  return menuBarMode === "visible"
}

export const applyWindowMenuBarMode = (
  win: BrowserWindow,
  menuBarMode: string,
): void => {
  const shouldShow = shouldShowMenuBar(menuBarMode)

  if (process.platform === "darwin") {
    if (shouldShow) {
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

export const createSecureWebPreferences = (
  preloadPath: string,
): BrowserWindowConstructorOptions["webPreferences"] => ({
  preload: preloadPath,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
})

export const withWindowIcon = (
  iconPath: string | undefined,
): Partial<BrowserWindowConstructorOptions> =>
  iconPath ? { icon: iconPath } : {}
