import { screen, type BrowserWindow, type BrowserWindowConstructorOptions } from "electron"
import { APP_NAME } from "../../../shared/constants/index.js"
import {
  applyWindowMenuBarMode,
  getTitleBarOptions,
  resolveWindowIconPath,
  withWindowIcon,
} from "./windowChrome.js"
import { loadRendererRoute } from "./windowRouting.js"

type LoggerLike = {
  info: (message: string, meta?: unknown) => void
  error: (message: string, meta?: unknown) => void
}

type CreateBrowserWindow = (
  options: BrowserWindowConstructorOptions,
) => BrowserWindow

export type StartupWizardWindowInput = {
  createBrowserWindow: CreateBrowserWindow
  getMenuBarMode: () => string
  logger: LoggerLike
  onClosed: () => void
}

export const calculateStartupWizardInitialBounds = (
  targetWindow?: BrowserWindow | null,
): {
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
} => {
  let display: Electron.Display | null = null
  try {
    if (targetWindow && !targetWindow.isDestroyed()) {
      display = screen.getDisplayMatching(targetWindow.getBounds())
    } else if (typeof screen?.getCursorScreenPoint === "function") {
      display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    } else if (typeof screen?.getPrimaryDisplay === "function") {
      display = screen.getPrimaryDisplay()
    }
  } catch {
    // headless or mock environment fallback
  }

  const workArea = display?.workArea ?? {
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  }

  const rawWidth = Math.round(workArea.width * 0.28)
  const rawHeight = Math.round(workArea.height * 0.65)

  const minWidth = 390
  const minHeight = 560

  const width = Math.min(
    Math.max(rawWidth, 420),
    560,
    Math.max(workArea.width - 40, minWidth),
  )
  const height = Math.min(
    Math.max(rawHeight, 600),
    820,
    Math.max(workArea.height - 40, minHeight),
  )

  const x = Math.round(workArea.x + (workArea.width - width) / 2)
  const y = Math.round(workArea.y + (workArea.height - height) / 2)

  return {
    x,
    y,
    width,
    height,
    minWidth,
    minHeight,
  }
}

export const calculateStartupWizardExpandedBounds = (
  targetWindow?: BrowserWindow | null,
): {
  x: number
  y: number
  width: number
  height: number
} => {
  let display: Electron.Display | null = null
  try {
    if (targetWindow && !targetWindow.isDestroyed()) {
      display = screen.getDisplayMatching(targetWindow.getBounds())
    } else if (typeof screen?.getCursorScreenPoint === "function") {
      display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    } else if (typeof screen?.getPrimaryDisplay === "function") {
      display = screen.getPrimaryDisplay()
    }
  } catch {
    // headless or mock environment fallback
  }

  const workArea = display?.workArea ?? {
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
  }

  const rawWidth = Math.round(workArea.width * 0.82)
  const rawHeight = Math.round(workArea.height * 0.82)

  const minWidth = 960
  const minHeight = 640

  const width = Math.min(
    Math.max(rawWidth, 1000),
    1600,
    Math.max(workArea.width - 40, minWidth),
  )
  const height = Math.min(
    Math.max(rawHeight, 680),
    1000,
    Math.max(workArea.height - 40, minHeight),
  )

  const x = Math.round(workArea.x + (workArea.width - width) / 2)
  const y = Math.round(workArea.y + (workArea.height - height) / 2)

  return {
    x,
    y,
    width,
    height,
  }
}

export const createStartupWizardBrowserWindow = (
  input: StartupWizardWindowInput,
): BrowserWindow => {
  const initialBounds = calculateStartupWizardInitialBounds()
  const window = input.createBrowserWindow({
    x: initialBounds.x,
    y: initialBounds.y,
    width: initialBounds.width,
    height: initialBounds.height,
    minWidth: initialBounds.minWidth,
    minHeight: initialBounds.minHeight,
    show: true,
    title: `${APP_NAME} Setup`,
    // NOTE: CSS 렌더 전 네이티브 flash를 막는 배경. --color-wizard-bootstrap(#212123,
    // dark의 --bg-sidebar 기준선)과 같은 값이라 A 단계 화면과 이어진다.
    backgroundColor: "#212123",
    ...withWindowIcon(resolveWindowIconPath()),
    ...getTitleBarOptions(),
    ...(process.platform !== "darwin" ? { autoHideMenuBar: true } : {}),
  })

  applyWindowMenuBarMode(window, input.getMenuBarMode())
  void loadRendererRoute({
    label: "startup wizard",
    route: { hash: "startup-wizard" },
    window,
    logger: input.logger,
  }).catch((error) => {
    input.logger.error("Failed to load startup wizard", { error })
  })

  window.on("closed", () => {
    input.onClosed()
    input.logger.info("Startup wizard window closed")
  })

  return window
}
