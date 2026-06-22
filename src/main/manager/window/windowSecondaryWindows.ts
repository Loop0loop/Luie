import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import { APP_NAME } from "../../../shared/constants/index.js"
import {
  applyWindowMenuBarMode,
  getTitleBarOptions,
  resolveWindowIconPath,
  shouldShowMenuBar,
  WINDOW_BACKGROUND_COLOR,
  withWindowIcon,
} from "./windowChrome.js"
import {
  loadRendererRoute,
  type RendererRouteTarget,
} from "./windowRouting.js"

type LoggerLike = {
  info: (message: string, meta?: unknown) => void
  error: (message: string, meta?: unknown) => void
}

type CreateBrowserWindow = (
  options: BrowserWindowConstructorOptions,
) => BrowserWindow

type SecondaryWindowInput = {
  createBrowserWindow: CreateBrowserWindow
  getMenuBarMode: () => string
  logger: LoggerLike
  onClosed: () => void
}

const secondaryWindowMenuOptions = (
  menuBarMode: string,
): Partial<BrowserWindowConstructorOptions> =>
  process.platform !== "darwin"
    ? { autoHideMenuBar: !shouldShowMenuBar(menuBarMode) }
    : {}

const attachWindowClosedLogger = (
  win: BrowserWindow,
  onClosed: () => void,
  label: string,
  logger: LoggerLike,
): void => {
  win.on("closed", () => {
    onClosed()
    logger.info(`${label} closed`)
  })
}

const loadSecondaryWindowRoute = async (input: {
  label: string
  logger: LoggerLike
  openDevToolsInDev?: boolean
  route: RendererRouteTarget
  window: BrowserWindow
}): Promise<void> => {
  const environment = await loadRendererRoute({
    label: input.label,
    logger: input.logger,
    route: input.route,
    window: input.window,
  })

  if (input.openDevToolsInDev && environment.useDevServer) {
    input.window.webContents.openDevTools({ mode: "detach" })
  }
}

export const createStartupWizardBrowserWindow = (
  input: SecondaryWindowInput,
): BrowserWindow => {
  const window = input.createBrowserWindow({
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

  applyWindowMenuBarMode(window, input.getMenuBarMode())
  void loadSecondaryWindowRoute({
    label: "startup wizard",
    route: { hash: "startup-wizard" },
    window,
    logger: input.logger,
  }).catch((error) => {
    input.logger.error("Failed to load startup wizard", { error })
  })

  attachWindowClosedLogger(
    window,
    input.onClosed,
    "Startup wizard window",
    input.logger,
  )
  return window
}

export const createExportBrowserWindow = (
  chapterId: string,
  input: SecondaryWindowInput,
): BrowserWindow => {
  const menuBarMode = input.getMenuBarMode()
  const window = input.createBrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: "내보내기 및 인쇄 미리보기",
    backgroundColor: WINDOW_BACKGROUND_COLOR,
    ...withWindowIcon(resolveWindowIconPath()),
    ...getTitleBarOptions(),
    ...secondaryWindowMenuOptions(menuBarMode),
  })

  applyWindowMenuBarMode(window, menuBarMode)
  const route = { hash: "export", search: `?chapterId=${chapterId}` }
  void loadSecondaryWindowRoute({
    label: "export window",
    openDevToolsInDev: true,
    route,
    window,
    logger: input.logger,
  }).catch((error) => {
    input.logger.error("Failed to load export window", { route, error })
  })

  attachWindowClosedLogger(window, input.onClosed, "Export window", input.logger)
  return window
}

export const createWorldGraphBrowserWindow = (
  input: SecondaryWindowInput,
): BrowserWindow => {
  const menuBarMode = input.getMenuBarMode()
  const window = input.createBrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 600,
    title: "세계관 그래프",
    backgroundColor: WINDOW_BACKGROUND_COLOR,
    ...withWindowIcon(resolveWindowIconPath()),
    ...getTitleBarOptions(),
    ...secondaryWindowMenuOptions(menuBarMode),
  })

  applyWindowMenuBarMode(window, menuBarMode)
  void loadSecondaryWindowRoute({
    label: "world graph window",
    openDevToolsInDev: true,
    route: { hash: "world-graph" },
    window,
    logger: input.logger,
  }).catch((error) => {
    input.logger.error("Failed to load world graph window", { error })
  })

  attachWindowClosedLogger(
    window,
    input.onClosed,
    "World graph window",
    input.logger,
  )
  return window
}
