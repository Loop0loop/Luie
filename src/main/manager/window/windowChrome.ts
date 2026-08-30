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
  const packagedCandidates =
    typeof process.resourcesPath === "string" && process.resourcesPath.length > 0
      ? [
          join(process.resourcesPath, "icon.png"),
          join(process.resourcesPath, "build", "icons", "icon.png"),
        ]
      : []
  const appPath =
    typeof app.getAppPath === "function" ? app.getAppPath() : undefined
  const devCandidates =
    typeof appPath === "string" && appPath.length > 0
      ? [
          join(appPath, "build", "icons", "icon.png"),
          join(appPath, "assets", "public", "luie.png"),
        ]
      : []

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

/**
 * 커스텀 트래픽 라이트 좌표를 다시 못박는다.
 *
 * `trafficLightPosition`은 창 생성 시점 옵션일 뿐이라, macOS가 타이틀바 컨테이너를 다시
 * 배치하면 유지되지 않는다. `setWindowButtonVisibility(false)`로 버튼을 숨기는 순간 좌표가
 * 시스템 기본값으로 리셋되고, 다시 노출하면 의도한 (16,16) 대신 기본 위치(더 위·더 오른쪽)에
 * 나타난다. 같은 계열의 리셋이 setRepresentedFilename/documentEdited/미니마이즈 복귀에서도
 * 보고돼 있다(electron/electron#48463, #34822, #30564).
 *
 * 따라서 버튼 가시성을 토글하는 경로는 토글 직후 반드시 이 함수로 좌표를 재적용해야 한다.
 */
export const applyTrafficLightPosition = (win: BrowserWindow): void => {
  if (process.platform !== "darwin") return
  win.setWindowButtonPosition({
    x: WINDOW_TRAFFIC_LIGHT_X,
    y: WINDOW_TRAFFIC_LIGHT_Y,
  })
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
  spellcheckEnabled = true,
): BrowserWindowConstructorOptions["webPreferences"] => ({
  preload: preloadPath,
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: spellcheckEnabled,
})

export const withWindowIcon = (
  iconPath: string | undefined,
): Partial<BrowserWindowConstructorOptions> =>
  iconPath ? { icon: iconPath } : {}
